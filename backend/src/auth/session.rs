//! Opaque bearer sessions stored (hashed) in Postgres: revocable, with sliding expiry.

use std::time::Duration;

use axum::{
    extract::{FromRequestParts, Request, State},
    http::{header, request::Parts},
    middleware::Next,
    response::Response,
};
use chrono::{DateTime, Utc};
use openidconnect::CsrfToken;
use sea_orm::{
    ActiveValue::Set, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter,
    sea_query::Expr,
};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{entities::session, error::ApiError, state::AppState};

/// Don't rewrite `expires_at` on every request; only once it has aged this much.
const RENEW_AFTER: Duration = Duration::from_secs(3600);

pub struct Sessions {
    /// Idle timeout: a session expires this long after its last use.
    idle_ttl: Duration,
    /// Absolute lifetime regardless of activity.
    max_age: Duration,
}

/// Authenticated request context, set by [`authenticate`].
#[derive(Clone, Copy, Debug)]
pub struct AuthUser {
    pub id: Uuid,
    pub session_id: Uuid,
}

fn hash(token: &str) -> String {
    Sha256::digest(token.as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

fn add(t: DateTime<Utc>, d: Duration) -> DateTime<Utc> {
    t + chrono::Duration::from_std(d).expect("duration in range")
}

impl Sessions {
    pub fn new(idle_ttl: Duration, max_age: Duration) -> Self {
        Self { idle_ttl, max_age }
    }

    /// Creates a session and returns its bearer token (only ever held by the client).
    pub async fn create(&self, db: &DatabaseConnection, user_id: Uuid) -> Result<String, DbErr> {
        let token = CsrfToken::new_random_len(32).into_secret();
        let now = Utc::now();
        session::Entity::insert(session::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            token_hash: Set(hash(&token)),
            created_at: Set(now),
            expires_at: Set(add(now, self.idle_ttl.min(self.max_age))),
        })
        .exec(db)
        .await?;
        Ok(token)
    }

    /// Resolves a bearer token, extending its expiry (capped at `max_age`) when due.
    pub async fn resolve(
        &self,
        db: &DatabaseConnection,
        token: &str,
    ) -> Result<Option<AuthUser>, DbErr> {
        let now = Utc::now();
        let Some(s) = session::Entity::find()
            .filter(session::Column::TokenHash.eq(hash(token)))
            .filter(session::Column::ExpiresAt.gt(now))
            .one(db)
            .await?
        else {
            return Ok(None);
        };

        let renewed = add(now, self.idle_ttl).min(add(s.created_at, self.max_age));
        if renewed > add(s.expires_at, RENEW_AFTER) {
            session::Entity::update_many()
                .col_expr(session::Column::ExpiresAt, Expr::value(renewed))
                .filter(session::Column::Id.eq(s.id))
                .exec(db)
                .await?;
        }
        Ok(Some(AuthUser {
            id: s.user_id,
            session_id: s.id,
        }))
    }

    pub async fn revoke(&self, db: &DatabaseConnection, session_id: Uuid) -> Result<(), DbErr> {
        session::Entity::delete_by_id(session_id).exec(db).await?;
        Ok(())
    }

    pub async fn revoke_all(&self, db: &DatabaseConnection, user_id: Uuid) -> Result<(), DbErr> {
        session::Entity::delete_many()
            .filter(session::Column::UserId.eq(user_id))
            .exec(db)
            .await?;
        Ok(())
    }

    /// Drops expired rows; called opportunistically on sign-in.
    pub async fn purge_expired(&self, db: &DatabaseConnection) -> Result<(), DbErr> {
        session::Entity::delete_many()
            .filter(session::Column::ExpiresAt.lte(Utc::now()))
            .exec(db)
            .await?;
        Ok(())
    }
}

pub fn bearer(parts: &axum::http::HeaderMap) -> Option<&str> {
    parts
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
}

/// Resolves the bearer token once per request and stores [`AuthUser`] in the request
/// extensions for handlers and the rate limiter. Invalid tokens are treated as anonymous.
pub async fn authenticate(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, ApiError> {
    if let Some(token) = bearer(req.headers()) {
        if let Some(user) = state.sessions.resolve(&state.db, token).await? {
            req.extensions_mut().insert(user);
        }
    }
    Ok(next.run(req).await)
}

/// Extractor for routes that require a signed-in user.
impl<S: Send + Sync> FromRequestParts<S> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<AuthUser>()
            .copied()
            .ok_or(ApiError::Unauthorized)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashes_to_hex_sha256() {
        assert_eq!(
            hash("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}
