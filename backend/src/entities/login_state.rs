use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "auth_login_states")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub state: String,
    pub provider: String,
    pub nonce: String,
    pub pkce_verifier: String,
    /// Opaque value from the SPA, echoed back so it can reject logins it didn't start.
    pub client_state: String,
    pub expires_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
