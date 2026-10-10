-- All songs' titles/artists (newline-joined), so filters match any song in a multi-song template.
ALTER TABLE templates DROP COLUMN search_vector;
ALTER TABLE templates ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', name), 'A') ||
    setweight(to_tsvector('simple', song_titles), 'A') ||
    setweight(to_tsvector('simple', song_artists), 'B') ||
    setweight(to_tsvector('simple', content), 'C')
) STORED;
CREATE INDEX templates_search_idx ON templates USING GIN (search_vector);

DROP INDEX templates_title_trgm_idx;
DROP INDEX templates_artist_trgm_idx;
CREATE INDEX templates_song_titles_trgm_idx ON templates USING GIN (song_titles gin_trgm_ops);
CREATE INDEX templates_song_artists_trgm_idx ON templates USING GIN (song_artists gin_trgm_ops);
