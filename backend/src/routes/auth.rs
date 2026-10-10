//! Sign-in flow:
//! 1. SPA navigates to `/auth/{provider}/start?client_state=<random>` (saved in sessionStorage).
//! 2. Provider redirects back to `/auth/{provider}/callback`.
//! 3. We redirect to `FRONTEND_URL?login_code=…&client_state=…` (or `login_error=…`).
//! 4. SPA checks `client_state` matches, then `POST /auth/exchange { code }` → `{ token, user }`.

use std::time::Duration;

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Redirect, Response},
};
use chrono::{DateTime, Utc};
use openidconnect::CsrfToken;
use sea_orm::{ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter, sea_query::OnConflict};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::{
    auth::{Identity, LoginFailed, session::AuthUser},
    entities::{login_code, login_state, user},
    error::ApiError,
    messages::Msg,
    state::AppState,
};

const LOGIN_STATE_TTL: Duration = Duration::from_secs(600);
const LOGIN_CODE_TTL: Duration = Duration::from_secs(60);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDto {
    id: Uuid,
    email: String,
    name: Option<String>,
    picture: Option<String>,
    created_at: DateTime<Utc>,
}

impl From<user::Model> for UserDto {
    fn from(u: user::Model) -> Self {
        Self {
            id: u.id,
            email: u.email,
            name: u.name,
            picture: u.picture,
            created_at: u.created_at,
        }
    }
}

#[derive(Serialize)]
pub struct SessionDto {
    token: String,
    user: UserDto,
}

/// Restricting the charset means it never needs escaping in URLs or the stub page.
fn valid_client_state(s: &str) -> bool {
    (16..=128).contains(&s.len())
        && s.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

fn frontend_redirect(state: &AppState, params: &[(&str, &str)]) -> Response {
    let mut url = state.auth.config.frontend_url.clone();
    url.query_pairs_mut().extend_pairs(params);
    Redirect::to(url.as_str()).into_response()
}

fn login_error(state: &AppState, client_state: Option<&str>, e: LoginFailed) -> Response {
    let mut params = vec![("login_error", e.0)];
    params.extend(client_state.map(|cs| ("client_state", cs)));
    frontend_redirect(state, &params)
}

fn expiry(ttl: Duration) -> DateTime<Utc> {
    Utc::now() + chrono::Duration::from_std(ttl).expect("small duration")
}

/// Lists sign-in options for the frontend.
pub async fn config(State(state): State<AppState>) -> Json<Value> {
    let base = &state.auth.config.public_url;
    let start = |path: String| base.join(&path).map(String::from).unwrap_or_default();
    #[allow(unused_mut)]
    let mut providers: Vec<Value> = state
        .auth
        .oidc
        .values()
        .map(|p| {
            json!({
                "name": p.name,
                "label": p.label,
                "startUrl": start(format!("auth/{}/start", p.name)),
            })
        })
        .collect();
    #[cfg(debug_assertions)]
    if state.auth.stub.is_some() {
        providers.push(json!({
            "name": "stub",
            "label": "Stub (dev)",
            "startUrl": start("auth/stub/login".into()),
        }));
    }
    Json(json!({ "providers": providers }))
}

#[derive(Deserialize)]
pub struct StartQuery {
    client_state: Option<String>,
}

pub async fn start(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    Query(q): Query<StartQuery>,
) -> Result<Response, ApiError> {
    let provider = state.auth.oidc.get(&provider).ok_or(ApiError::NotFound)?;
    let Some(client_state) = q.client_state.filter(|cs| valid_client_state(cs)) else {
        return Ok(login_error(
            &state,
            None,
            LoginFailed("invalid_client_state"),
        ));
    };
    let started = match provider.start(&state.auth.http).await {
        Ok(s) => s,
        Err(e) => return Ok(login_error(&state, Some(&client_state), e)),
    };

    login_state::Entity::delete_many()
        .filter(login_state::Column::ExpiresAt.lt(Utc::now()))
        .exec(&state.db)
        .await?;
    login_state::Entity::insert(login_state::ActiveModel {
        state: Set(started.state),
        provider: Set(provider.name.clone()),
        nonce: Set(started.nonce),
        pkce_verifier: Set(started.pkce_verifier),
        client_state: Set(client_state),
        expires_at: Set(expiry(LOGIN_STATE_TTL)),
    })
    .exec(&state.db)
    .await?;

    Ok(Redirect::to(started.url.as_str()).into_response())
}

#[derive(Deserialize)]
pub struct CallbackQuery {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

pub async fn callback(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    Query(q): Query<CallbackQuery>,
) -> Result<Response, ApiError> {
    let provider = state.auth.oidc.get(&provider).ok_or(ApiError::NotFound)?;

    // Single use: the row is deleted whether or not the rest succeeds.
    let pending = match q.state {
        Some(s) => login_state::Entity::delete_many()
            .filter(login_state::Column::State.eq(s))
            .filter(login_state::Column::Provider.eq(&provider.name))
            .filter(login_state::Column::ExpiresAt.gt(Utc::now()))
            .exec_with_returning(&state.db)
            .await?
            .pop(),
        None => None,
    };
    let Some(pending) = pending else {
        return Ok(login_error(&state, None, LoginFailed("invalid_state")));
    };
    let cs = Some(pending.client_state.as_str());

    if let Some(error) = q.error {
        tracing::info!(provider = %provider.name, "provider returned error: {error}");
        let code = if error == "access_denied" {
            "access_denied"
        } else {
            "provider_error"
        };
        return Ok(login_error(&state, cs, LoginFailed(code)));
    }
    let Some(code) = q.code else {
        return Ok(login_error(&state, cs, LoginFailed("provider_error")));
    };

    match provider
        .finish(&state.auth.http, code, pending.nonce, pending.pkce_verifier)
        .await
    {
        Ok(identity) => complete_sign_in(&state, identity, &pending.client_state).await,
        Err(e) => Ok(login_error(&state, cs, e)),
    }
}

#[cfg(debug_assertions)]
pub use stub::{stub_form, stub_submit};

#[cfg(debug_assertions)]
mod stub {
    use axum::{
        Form,
        extract::{Query, State},
        response::{Html, IntoResponse, Redirect, Response},
    };
    use serde::Deserialize;

    use super::{complete_sign_in, login_error, valid_client_state};
    use crate::{auth::LoginFailed, error::ApiError, state::AppState};

    const PAGE: &str = include_str!("../auth/stub_login.html");

    #[derive(Deserialize)]
    pub struct StubFormQuery {
        client_state: Option<String>,
        error: Option<String>,
    }

    pub async fn stub_form(
        State(state): State<AppState>,
        Query(q): Query<StubFormQuery>,
    ) -> Result<Response, ApiError> {
        if state.auth.stub.is_none() {
            return Err(ApiError::NotFound);
        }
        let Some(client_state) = q.client_state.filter(|cs| valid_client_state(cs)) else {
            return Ok(login_error(
                &state,
                None,
                LoginFailed("invalid_client_state"),
            ));
        };
        let error = match q.error {
            Some(_) => r#"<p class="error">Wrong email or password.</p>"#,
            None => "",
        };
        Ok(Html(
            PAGE.replace("{{client_state}}", &client_state)
                .replace("{{error}}", error),
        )
        .into_response())
    }

    #[derive(Deserialize)]
    pub struct StubLogin {
        client_state: String,
        email: String,
        password: String,
    }

    pub async fn stub_submit(
        State(state): State<AppState>,
        Form(form): Form<StubLogin>,
    ) -> Result<Response, ApiError> {
        let Some(users) = state.auth.stub.as_ref() else {
            return Err(ApiError::NotFound);
        };
        if !valid_client_state(&form.client_state) {
            return Ok(login_error(
                &state,
                None,
                LoginFailed("invalid_client_state"),
            ));
        }
        match users.verify(&form.email, &form.password).await {
            Ok(identity) => complete_sign_in(&state, identity, &form.client_state).await,
            Err(ApiError::Unauthorized) => Ok(Redirect::to(&format!(
                "login?client_state={}&error=1",
                form.client_state
            ))
            .into_response()),
            Err(e) => Err(e),
        }
    }
}

/// Upserts the local user and hands the SPA a single-use login code.
async fn complete_sign_in(
    state: &AppState,
    identity: Identity,
    client_state: &str,
) -> Result<Response, ApiError> {
    let now = Utc::now();
    let user = user::Entity::insert(user::ActiveModel {
        id: Set(Uuid::new_v4()),
        auth_issuer: Set(identity.issuer),
        auth_subject: Set(identity.subject),
        email: Set(identity.email),
        name: Set(identity.name),
        picture: Set(identity.picture),
        created_at: Set(now),
        updated_at: Set(now),
    })
    .on_conflict(
        OnConflict::columns([user::Column::AuthIssuer, user::Column::AuthSubject])
            .update_columns([
                user::Column::Email,
                user::Column::Name,
                user::Column::Picture,
                user::Column::UpdatedAt,
            ])
            .to_owned(),
    )
    .exec_with_returning(&state.db)
    .await?;

    login_code::Entity::delete_many()
        .filter(login_code::Column::ExpiresAt.lt(now))
        .exec(&state.db)
        .await?;
    let code = CsrfToken::new_random().into_secret();
    login_code::Entity::insert(login_code::ActiveModel {
        code: Set(code.clone()),
        user_id: Set(user.id),
        expires_at: Set(expiry(LOGIN_CODE_TTL)),
    })
    .exec(&state.db)
    .await?;

    Ok(frontend_redirect(
        state,
        &[("login_code", &code), ("client_state", client_state)],
    ))
}

#[derive(Deserialize)]
pub struct ExchangeRequest {
    code: String,
}

pub async fn exchange(
    State(state): State<AppState>,
    Json(body): Json<ExchangeRequest>,
) -> Result<Json<SessionDto>, ApiError> {
    let invalid = || ApiError::BadRequest(Msg::LoginCodeInvalid.text());
    let login = login_code::Entity::delete_many()
        .filter(login_code::Column::Code.eq(body.code))
        .filter(login_code::Column::ExpiresAt.gt(Utc::now()))
        .exec_with_returning(&state.db)
        .await?
        .pop()
        .ok_or_else(invalid)?;
    let user = user::Entity::find_by_id(login.user_id)
        .one(&state.db)
        .await?
        .ok_or_else(invalid)?;
    state.sessions.purge_expired(&state.db).await?;
    Ok(Json(SessionDto {
        token: state.sessions.create(&state.db, user.id).await?,
        user: user.into(),
    }))
}

/// Revokes the current session.
pub async fn logout(State(state): State<AppState>, user: AuthUser) -> Result<StatusCode, ApiError> {
    state.sessions.revoke(&state.db, user.session_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Revokes every session of the current user.
pub async fn logout_all(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<StatusCode, ApiError> {
    state.sessions.revoke_all(&state.db, user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Deletes the account; templates, sessions and login codes cascade.
pub async fn delete_me(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<StatusCode, ApiError> {
    user::Entity::delete_by_id(user.id).exec(&state.db).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn me(State(state): State<AppState>, user: AuthUser) -> Result<Json<UserDto>, ApiError> {
    user::Entity::find_by_id(user.id)
        .one(&state.db)
        .await?
        .map(|u| Json(u.into()))
        .ok_or(ApiError::Unauthorized)
}

#[cfg(test)]
mod tests {
    use super::valid_client_state;

    #[test]
    fn client_state_charset_and_length() {
        assert!(valid_client_state("abcdefghijklmnop"));
        assert!(valid_client_state(&"A-_9".repeat(32)));
        assert!(!valid_client_state("short"));
        assert!(!valid_client_state(&"a".repeat(129)));
        assert!(!valid_client_state("abcdefghijklmnop\"><script>"));
    }
}
