CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Names are unique per user, case-insensitively (matches client-side rule).
CREATE UNIQUE INDEX templates_user_name_key ON templates (user_id, lower(btrim(name)));
CREATE INDEX templates_user_updated_idx ON templates (user_id, updated_at DESC);

-- 'simple' config: lyrics may be in any language, no stemming/stopwords.
ALTER TABLE templates ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', name), 'A') ||
    setweight(to_tsvector('simple', title), 'A') ||
    setweight(to_tsvector('simple', coalesce(artist, '')), 'B') ||
    setweight(to_tsvector('simple', content), 'C')
) STORED;
CREATE INDEX templates_search_idx ON templates USING GIN (search_vector);

-- Substring (ILIKE) search per field.
CREATE INDEX templates_name_trgm_idx ON templates USING GIN (name gin_trgm_ops);
CREATE INDEX templates_title_trgm_idx ON templates USING GIN (title gin_trgm_ops);
CREATE INDEX templates_artist_trgm_idx ON templates USING GIN (artist gin_trgm_ops);
CREATE INDEX templates_content_trgm_idx ON templates USING GIN (content gin_trgm_ops);
