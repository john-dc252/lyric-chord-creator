use std::net::SocketAddr;

use lyric_chord_backend::{InitError, app, config::Config, init_state};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), InitError> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = Config::from_env()?;
    let state = init_state(&config).await?;
    let listener = tokio::net::TcpListener::bind(config.bind_addr).await?;
    tracing::info!("listening on {}", config.bind_addr);

    axum::serve(
        listener,
        app(state, &config).into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async {
        tokio::signal::ctrl_c().await.ok();
    })
    .await?;
    Ok(())
}
