pub mod archive;
pub mod auth;
pub mod config;
pub mod entities;
pub mod error;
pub mod messages;
pub mod metadata;
pub mod migration;
pub mod rate_limit;
pub mod routes;
pub mod state;

rust_i18n::i18n!("locales", fallback = "en");

use std::sync::Arc;

use axum::{
    Router,
    http::{Method, header},
};
use sea_orm::{ConnectOptions, ConnectionTrait, Database, TransactionTrait};
use sea_orm_migration::MigratorTrait;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::{
    auth::{
        Auth,
        session::{Sessions, authenticate},
    },
    config::Config,
    rate_limit::{ClientKeyExtractor, tier},
    routes::Tiers,
    state::AppState,
};

pub type InitError = Box<dyn std::error::Error + Send + Sync>;

/// Connects to the database and applies pending migrations.
pub async fn init_state(config: &Config) -> Result<AppState, InitError> {
    let mut opts = ConnectOptions::new(&config.database_url);
    opts.max_connections(config.db_max_connections)
        .sqlx_logging(false);
    let db = Database::connect(opts).await?;
    // Serialize migrations across concurrently starting instances.
    let txn = db.begin().await?;
    txn.execute_unprepared("SELECT pg_advisory_xact_lock(7311503229044461)")
        .await?;
    migration::Migrator::up(&txn, None).await?;
    txn.commit().await?;

    Ok(AppState {
        db,
        sessions: Arc::new(Sessions::new(
            config.session_idle_ttl,
            config.session_max_age,
        )),
        auth: Arc::new(Auth::from_config(&config.auth)?),
    })
}

pub fn app(state: AppState, config: &Config) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(config.cors_origins.clone())
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .expose_headers([header::RETRY_AFTER, header::CONTENT_DISPOSITION])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);

    let limits = &config.rate_limit;
    let extractor = ClientKeyExtractor::new(limits.client_ip_header.clone());
    let tiers = Tiers {
        sign_in: tier(limits.sign_in_per_minute, extractor.clone()),
        auth_read: tier(limits.auth_read_per_minute, extractor.clone()),
        template_read: tier(limits.template_read_per_minute, extractor.clone()),
        template_write: tier(limits.template_write_per_minute, extractor),
    };

    routes::router(tiers)
        // Outermost of the route layers, so rate limiting sees the resolved user.
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            authenticate,
        ))
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}
