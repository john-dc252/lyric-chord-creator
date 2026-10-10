use axum::{
    Json,
    extract::{Path, Query, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Utc};
use sea_orm::{
    ActiveModelTrait,
    ActiveValue::Set,
    ColumnTrait, Condition, DbErr, EntityTrait, IntoActiveModel, QueryFilter, QueryOrder, SqlErr,
    sea_query::{Expr, extension::postgres::PgExpr},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    archive,
    auth::session::AuthUser,
    entities::template::{self, Column},
    error::ApiError,
    messages::Msg,
    metadata::{self, SongIndex},
    state::AppState,
};

const MAX_NAME_LEN: usize = 200;
const MAX_CONTENT_LEN: usize = 1 << 20;
const MAX_BATCH: usize = 100;

/// Same shape as the frontend's `SavedTemplate` (timestamps in epoch ms).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateDto {
    id: Uuid,
    name: String,
    content: String,
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    artist: Option<String>,
    created_at: i64,
    updated_at: i64,
}

impl From<template::Model> for TemplateDto {
    fn from(t: template::Model) -> Self {
        Self {
            id: t.id,
            name: t.name,
            content: t.content,
            title: t.title,
            artist: t.artist,
            created_at: t.created_at.timestamp_millis(),
            updated_at: t.updated_at.timestamp_millis(),
        }
    }
}

#[derive(Deserialize, Default, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum SearchField {
    #[default]
    All,
    Name,
    Title,
    Artist,
    Lyrics,
}

#[derive(Deserialize)]
pub struct ListQuery {
    q: Option<String>,
    #[serde(default)]
    field: SearchField,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateInput {
    name: String,
    content: String,
    /// Optional epoch-ms timestamps so local templates keep their history when synced.
    created_at: Option<i64>,
    updated_at: Option<i64>,
}

impl TemplateInput {
    fn validated(self) -> Result<Self, ApiError> {
        let name = self.name.trim().to_owned();
        if name.is_empty() {
            return Err(ApiError::BadRequest(Msg::TemplateNameEmpty.text()));
        }
        if name.chars().count() > MAX_NAME_LEN {
            return Err(ApiError::BadRequest(
                Msg::TemplateNameTooLong.fill(&[("max", &MAX_NAME_LEN)]),
            ));
        }
        if self.content.len() > MAX_CONTENT_LEN {
            return Err(ApiError::BadRequest(Msg::TemplateContentTooLarge.text()));
        }
        Ok(Self { name, ..self })
    }
}

fn millis(ms: Option<i64>, fallback: DateTime<Utc>) -> Result<DateTime<Utc>, ApiError> {
    ms.map_or(Ok(fallback), |ms| {
        DateTime::from_timestamp_millis(ms)
            .ok_or_else(|| ApiError::BadRequest(Msg::InvalidTimestamp.text()))
    })
}

fn escape_like(s: &str) -> String {
    s.replace('\\', r"\\")
        .replace('%', r"\%")
        .replace('_', r"\_")
}

fn name_taken(name: &str) -> ApiError {
    ApiError::Conflict(Msg::TemplateNameTaken.fill(&[("name", &name)]))
}

fn map_write_err(e: DbErr, name: &str) -> ApiError {
    match e.sql_err() {
        Some(SqlErr::UniqueConstraintViolation(msg))
            if str::contains(&msg, "templates_user_name_key") =>
        {
            name_taken(name)
        }
        Some(SqlErr::UniqueConstraintViolation(_)) => {
            ApiError::Conflict(Msg::TemplateIdTaken.text())
        }
        _ => e.into(),
    }
}

/// Case-insensitive name check, scoped to the user (mirrors `isTemplateNameUnique`).
async fn ensure_name_free(
    state: &AppState,
    user_id: Uuid,
    name: &str,
    exclude: Option<Uuid>,
) -> Result<(), ApiError> {
    let mut query = template::Entity::find()
        .filter(Column::UserId.eq(user_id))
        .filter(Expr::cust_with_values(
            "lower(btrim(name)) = lower(btrim($1))",
            [name],
        ));
    if let Some(id) = exclude {
        query = query.filter(Column::Id.ne(id));
    }
    match query.one(&state.db).await? {
        Some(_) => Err(name_taken(name)),
        None => Ok(()),
    }
}

async fn find_owned(
    state: &AppState,
    user_id: Uuid,
    id: Uuid,
) -> Result<Option<template::Model>, ApiError> {
    Ok(template::Entity::find_by_id(id)
        .filter(Column::UserId.eq(user_id))
        .one(&state.db)
        .await?)
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<ListQuery>,
) -> Result<Json<Vec<TemplateDto>>, ApiError> {
    let mut query = template::Entity::find().filter(Column::UserId.eq(user.id));

    if let Some(q) = params.q.as_deref().map(str::trim).filter(|q| !q.is_empty()) {
        let like = format!("%{}%", escape_like(q));
        let ilike = |col: Column| Expr::col(col).ilike(like.clone());
        query = match params.field {
            SearchField::Name => query.filter(ilike(Column::Name)),
            SearchField::Title => query.filter(ilike(Column::SongTitles)),
            SearchField::Artist => query.filter(ilike(Column::SongArtists)),
            SearchField::Lyrics => query.filter(ilike(Column::Content)),
            // Ranked full-text match, plus substring match on short fields for type-ahead.
            SearchField::All => query
                .filter(
                    Condition::any()
                        .add(Expr::cust_with_values(
                            "search_vector @@ websearch_to_tsquery('simple', $1)",
                            [q],
                        ))
                        .add(ilike(Column::Name))
                        .add(ilike(Column::SongTitles))
                        .add(ilike(Column::SongArtists)),
                )
                .order_by_desc(Expr::cust_with_values(
                    "ts_rank(search_vector, websearch_to_tsquery('simple', $1))",
                    [q],
                )),
        };
    }

    let rows = query
        .order_by_desc(Column::UpdatedAt)
        .all(&state.db)
        .await?;
    Ok(Json(rows.into_iter().map(Into::into).collect()))
}

pub async fn get(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<TemplateDto>, ApiError> {
    find_owned(&state, user.id, id)
        .await?
        .map(|t| Json(t.into()))
        .ok_or(ApiError::NotFound)
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(input): Json<TemplateInput>,
) -> Result<(StatusCode, Json<TemplateDto>), ApiError> {
    let saved = insert(&state, user.id, Uuid::new_v4(), input.validated()?).await?;
    Ok((StatusCode::CREATED, Json(saved.into())))
}

/// Create-or-update with a client-chosen id (used to sync local templates).
pub async fn put(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(input): Json<TemplateInput>,
) -> Result<(StatusCode, Json<TemplateDto>), ApiError> {
    let input = input.validated()?;
    let Some(existing) = find_owned(&state, user.id, id).await? else {
        let saved = insert(&state, user.id, id, input).await?;
        return Ok((StatusCode::CREATED, Json(saved.into())));
    };

    ensure_name_free(&state, user.id, &input.name, Some(id)).await?;
    let mut model = existing.into_active_model();
    model.title = Set(metadata::song_title(&input.content));
    model.artist = Set(metadata::song_artist(&input.content));
    let songs = SongIndex::from_content(&input.content);
    model.song_titles = Set(songs.titles);
    model.song_artists = Set(songs.artists);
    model.updated_at = Set(millis(input.updated_at, Utc::now())?);
    model.name = Set(input.name.clone());
    model.content = Set(input.content);
    let saved = model
        .update(&state.db)
        .await
        .map_err(|e| map_write_err(e, &input.name))?;
    Ok((StatusCode::OK, Json(saved.into())))
}

pub async fn delete(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let res = template::Entity::delete_many()
        .filter(Column::Id.eq(id))
        .filter(Column::UserId.eq(user.id))
        .exec(&state.db)
        .await?;
    match res.rows_affected {
        0 => Err(ApiError::NotFound),
        _ => Ok(StatusCode::NO_CONTENT),
    }
}

async fn insert(
    state: &AppState,
    user_id: Uuid,
    id: Uuid,
    input: TemplateInput,
) -> Result<template::Model, ApiError> {
    ensure_name_free(state, user_id, &input.name, None).await?;
    let now = Utc::now();
    let created_at = millis(input.created_at, now)?;
    let songs = SongIndex::from_content(&input.content);
    let model = template::ActiveModel {
        id: Set(id),
        user_id: Set(user_id),
        title: Set(metadata::song_title(&input.content)),
        artist: Set(metadata::song_artist(&input.content)),
        song_titles: Set(songs.titles),
        song_artists: Set(songs.artists),
        created_at: Set(created_at),
        updated_at: Set(millis(input.updated_at, created_at.max(now))?),
        name: Set(input.name.clone()),
        content: Set(input.content),
    };
    model
        .insert(&state.db)
        .await
        .map_err(|e| map_write_err(e, &input.name))
}

#[derive(Deserialize)]
pub struct BatchInput {
    templates: Vec<TemplateInput>,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum BatchResult {
    Created { template: TemplateDto },
    Failed { status: u16, error: String },
}

/// Creates up to [`MAX_BATCH`] templates; each item succeeds or fails on its own.
pub async fn batch(
    State(state): State<AppState>,
    user: AuthUser,
    Json(input): Json<BatchInput>,
) -> Result<Json<Vec<BatchResult>>, ApiError> {
    if input.templates.len() > MAX_BATCH {
        return Err(ApiError::BadRequest(
            Msg::BatchTooLarge.fill(&[("max", &MAX_BATCH)]),
        ));
    }
    let mut results = Vec::with_capacity(input.templates.len());
    for item in input.templates {
        let saved = match item.validated() {
            Ok(item) => insert(&state, user.id, Uuid::new_v4(), item).await,
            Err(e) => Err(e),
        };
        results.push(match saved {
            Ok(t) => BatchResult::Created { template: t.into() },
            Err(ApiError::Internal(msg)) => return Err(ApiError::Internal(msg)),
            Err(e) => BatchResult::Failed {
                status: e.status().as_u16(),
                error: e.to_string(),
            },
        });
    }
    Ok(Json(results))
}

/// The user's whole cloud library as a zip of `.lcct.txt` files.
pub async fn export(State(state): State<AppState>, user: AuthUser) -> Result<Response, ApiError> {
    let rows = template::Entity::find()
        .filter(Column::UserId.eq(user.id))
        .order_by_asc(Column::CreatedAt)
        .all(&state.db)
        .await?;
    let entries: Vec<_> = rows
        .iter()
        .map(|t| archive::Entry {
            name: &t.name,
            content: &t.content,
            modified: t.updated_at,
        })
        .collect();
    let bytes = archive::build(&entries).map_err(ApiError::internal)?;
    let filename = format!(
        "lyric-chord-cloud-library-{}.zip",
        Utc::now().format("%Y-%m-%d")
    );
    Ok((
        [
            (header::CONTENT_TYPE, "application/zip".to_owned()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{filename}\""),
            ),
        ],
        bytes,
    )
        .into_response())
}
