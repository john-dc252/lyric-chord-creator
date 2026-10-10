use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    AuthProvider,
    AuthSubject,
    Email,
    Name,
    Picture,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Templates {
    Table,
    Id,
    UserId,
    Name,
    Content,
    Title,
    Artist,
    CreatedAt,
    UpdatedAt,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Users::Table)
                    .col(uuid(Users::Id).primary_key())
                    .col(text(Users::AuthProvider))
                    .col(text(Users::AuthSubject))
                    .col(text(Users::Email))
                    .col(text_null(Users::Name))
                    .col(text_null(Users::Picture))
                    .col(
                        timestamp_with_time_zone(Users::CreatedAt)
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        timestamp_with_time_zone(Users::UpdatedAt)
                            .default(Expr::current_timestamp()),
                    )
                    .index(
                        Index::create()
                            .name("users_auth_identity_key")
                            .col(Users::AuthProvider)
                            .col(Users::AuthSubject)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Templates::Table)
                    .col(uuid(Templates::Id).primary_key())
                    .col(uuid(Templates::UserId))
                    .col(text(Templates::Name))
                    .col(text(Templates::Content))
                    .col(text(Templates::Title))
                    .col(text_null(Templates::Artist))
                    .col(
                        timestamp_with_time_zone(Templates::CreatedAt)
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        timestamp_with_time_zone(Templates::UpdatedAt)
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Templates::Table, Templates::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Postgres-specific pieces the schema builder can't express.
        manager
            .get_connection()
            .execute_unprepared(include_str!("sql/m20261003_000001_init.up.sql"))
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Templates::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Users::Table).to_owned())
            .await
    }
}
