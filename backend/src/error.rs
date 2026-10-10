use axum::{
    Json,
    http::{StatusCode, header},
    response::{IntoResponse, Response},
};
use serde_json::json;

use crate::messages::Msg;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("{0}")]
    BadRequest(String),
    #[error("{}", Msg::Unauthorized.text())]
    Unauthorized,
    #[error("{}", Msg::NotFound.text())]
    NotFound,
    #[error("{0}")]
    Conflict(String),
    #[error("{}", Msg::RateLimited.fill(&[("seconds", &retry_secs(.0))]))]
    RateLimited(std::time::Duration),
    #[error("internal error: {0}")]
    Internal(String),
}

fn retry_secs(d: &std::time::Duration) -> u64 {
    d.as_secs_f64().ceil() as u64
}

impl ApiError {
    pub fn internal(e: impl std::fmt::Display) -> Self {
        Self::Internal(e.to_string())
    }

    pub fn status(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::RateLimited(_) => StatusCode::TOO_MANY_REQUESTS,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl From<sea_orm::DbErr> for ApiError {
    fn from(e: sea_orm::DbErr) -> Self {
        Self::internal(e)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = self.status();
        match &self {
            Self::RateLimited(retry_after) => (
                status,
                [(header::RETRY_AFTER, retry_secs(retry_after).to_string())],
                Json(json!({ "error": self.to_string() })),
            )
                .into_response(),
            Self::Internal(msg) => {
                tracing::error!("{msg}");
                (status, Json(json!({ "error": Msg::InternalError.text() }))).into_response()
            }
            _ => (status, Json(json!({ "error": self.to_string() }))).into_response(),
        }
    }
}
