use sea_orm::{DbBackend, Statement};
use sea_orm_migration::{prelude::*, schema::*};

use crate::metadata;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Sessions {
    Table,
    Id,
    UserId,
    TokenHash,
    CreatedAt,
    ExpiresAt,
}

#[derive(DeriveIden)]
enum Templates {
    Table,
    SongTitles,
    SongArtists,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Sessions::Table)
                    .col(uuid(Sessions::Id).primary_key())
                    .col(uuid(Sessions::UserId))
                    // SHA-256 of the bearer token; the token itself is never stored.
                    .col(text(Sessions::TokenHash).unique_key())
                    .col(timestamp_with_time_zone(Sessions::CreatedAt))
                    .col(timestamp_with_time_zone(Sessions::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .from(Sessions::Table, Sessions::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("sessions_user_idx")
                    .table(Sessions::Table)
                    .col(Sessions::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Templates::Table)
                    .add_column(text(Templates::SongTitles).default(""))
                    .add_column(text(Templates::SongArtists).default(""))
                    .to_owned(),
            )
            .await?;

        // Backfill with the same parser the API uses.
        let db = manager.get_connection();
        let rows = db
            .query_all_raw(Statement::from_string(
                DbBackend::Postgres,
                "SELECT id, content FROM templates",
            ))
            .await?;
        for row in rows {
            let id: uuid::Uuid = row.try_get("", "id")?;
            let content: String = row.try_get("", "content")?;
            let songs = metadata::SongIndex::from_content(&content);
            db.execute_raw(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "UPDATE templates SET song_titles = $1, song_artists = $2 WHERE id = $3",
                [songs.titles.into(), songs.artists.into(), id.into()],
            ))
            .await?;
        }

        db.execute_unprepared(include_str!("sql/m20261005_000003_songs.up.sql"))
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Sessions::Table).to_owned())
            .await?;
        manager
            .get_connection()
            .execute_unprepared(include_str!("sql/m20261005_000003_songs.down.sql"))
            .await?;
        Ok(())
    }
}
