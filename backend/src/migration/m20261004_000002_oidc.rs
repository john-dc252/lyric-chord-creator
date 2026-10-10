use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    AuthProvider,
    AuthIssuer,
}

#[derive(DeriveIden)]
enum AuthLoginStates {
    Table,
    State,
    Provider,
    Nonce,
    PkceVerifier,
    ClientState,
    ExpiresAt,
}

#[derive(DeriveIden)]
enum AuthLoginCodes {
    Table,
    Code,
    UserId,
    ExpiresAt,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Identities are keyed by OIDC issuer URL (or "stub"), not a config label.
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .rename_column(Users::AuthProvider, Users::AuthIssuer)
                    .to_owned(),
            )
            .await?;

        // Pending authorization requests between /start and /callback.
        manager
            .create_table(
                Table::create()
                    .table(AuthLoginStates::Table)
                    .col(text(AuthLoginStates::State).primary_key())
                    .col(text(AuthLoginStates::Provider))
                    .col(text(AuthLoginStates::Nonce))
                    .col(text(AuthLoginStates::PkceVerifier))
                    .col(text(AuthLoginStates::ClientState))
                    .col(timestamp_with_time_zone(AuthLoginStates::ExpiresAt))
                    .to_owned(),
            )
            .await?;

        // Single-use codes the SPA exchanges for a session token.
        manager
            .create_table(
                Table::create()
                    .table(AuthLoginCodes::Table)
                    .col(text(AuthLoginCodes::Code).primary_key())
                    .col(uuid(AuthLoginCodes::UserId))
                    .col(timestamp_with_time_zone(AuthLoginCodes::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .from(AuthLoginCodes::Table, AuthLoginCodes::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        for (table, name) in [
            (
                AuthLoginStates::Table.into_iden(),
                "auth_login_states_expires_idx",
            ),
            (
                AuthLoginCodes::Table.into_iden(),
                "auth_login_codes_expires_idx",
            ),
        ] {
            manager
                .create_index(
                    Index::create()
                        .name(name)
                        .table(table)
                        .col(Alias::new("expires_at"))
                        .to_owned(),
                )
                .await?;
        }
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AuthLoginCodes::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AuthLoginStates::Table).to_owned())
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .rename_column(Users::AuthIssuer, Users::AuthProvider)
                    .to_owned(),
            )
            .await
    }
}
