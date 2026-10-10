DROP INDEX templates_song_titles_trgm_idx;
DROP INDEX templates_song_artists_trgm_idx;
ALTER TABLE templates DROP COLUMN search_vector;
ALTER TABLE templates DROP COLUMN song_titles, DROP COLUMN song_artists;
ALTER TABLE templates ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', name), 'A') ||
    setweight(to_tsvector('simple', title), 'A') ||
    setweight(to_tsvector('simple', coalesce(artist, '')), 'B') ||
    setweight(to_tsvector('simple', content), 'C')
) STORED;
CREATE INDEX templates_search_idx ON templates USING GIN (search_vector);
CREATE INDEX templates_title_trgm_idx ON templates USING GIN (title gin_trgm_ops);
CREATE INDEX templates_artist_trgm_idx ON templates USING GIN (artist gin_trgm_ops);
