use std::sync::Arc;

use sea_orm::DatabaseConnection;

use crate::auth::{Auth, session::Sessions};

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub sessions: Arc<Sessions>,
    pub auth: Arc<Auth>,
}
