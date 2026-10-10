use sea_orm::entity::prelude::*;

/// `search_vector` (generated tsvector) is intentionally not mapped.
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "templates")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    #[sea_orm(column_type = "Text")]
    pub content: String,
    pub title: String,
    pub artist: Option<String>,
    /// Newline-joined titles/artists of every song (for search).
    #[sea_orm(column_type = "Text")]
    pub song_titles: String,
    #[sea_orm(column_type = "Text")]
    pub song_artists: String,
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id",
        on_delete = "Cascade"
    )]
    User,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
