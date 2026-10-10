mod auth;
mod templates;

use axum::{
    Router,
    routing::{get, post, put},
};

use crate::{rate_limit::TierLayer, state::AppState};

/// One optional rate-limit layer per tier (`None` = tier disabled).
pub struct Tiers {
    pub sign_in: Option<TierLayer>,
    pub auth_read: Option<TierLayer>,
    pub template_read: Option<TierLayer>,
    pub template_write: Option<TierLayer>,
}

fn limited(router: Router<AppState>, tier: Option<TierLayer>) -> Router<AppState> {
    match tier {
        Some(layer) => router.route_layer(layer),
        None => router,
    }
}

/// `/health` is not rate limited.
pub fn router(tiers: Tiers) -> Router<AppState> {
    let sign_in = Router::new()
        .route("/auth/{provider}/start", get(auth::start))
        .route("/auth/{provider}/callback", get(auth::callback))
        .route("/auth/exchange", post(auth::exchange));
    #[cfg(debug_assertions)]
    let sign_in = sign_in.route(
        "/auth/stub/login",
        get(auth::stub_form).post(auth::stub_submit),
    );

    let auth_read = Router::new()
        .route("/auth/config", get(auth::config))
        .route("/auth/me", get(auth::me).delete(auth::delete_me))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/logout-all", post(auth::logout_all));

    let template_read = Router::new()
        .route("/templates", get(templates::list))
        .route("/templates/export", get(templates::export))
        .route("/templates/{id}", get(templates::get));

    let template_write = Router::new()
        .route("/templates", post(templates::create))
        .route("/templates/batch", post(templates::batch))
        .route(
            "/templates/{id}",
            put(templates::put).delete(templates::delete),
        );

    Router::new()
        .route("/health", get(|| async { "ok" }))
        .merge(limited(sign_in, tiers.sign_in))
        .merge(limited(auth_read, tiers.auth_read))
        .merge(limited(template_read, tiers.template_read))
        .merge(limited(template_write, tiers.template_write))
}
