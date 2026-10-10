//! Mirrors `extractSongTitle` / `extractSongArtist` / `extractSongsMetadata` in
//! src/lib/template-processor.

fn directive<'a>(content: &'a str, prefix: &str) -> Option<&'a str> {
    content
        .lines()
        .map(str::trim)
        .find_map(|line| line.strip_prefix(prefix))
        .map(str::trim)
        .filter(|v| !v.is_empty())
}

pub fn song_title(content: &str) -> String {
    directive(content, "@title:")
        .unwrap_or("Untitled Song")
        .to_owned()
}

pub fn song_artist(content: &str) -> Option<String> {
    directive(content, "@artist:").map(str::to_owned)
}

#[derive(Debug, PartialEq, Eq)]
pub struct Song {
    pub title: String,
    pub artist: Option<String>,
}

/// Each `@title:` starts a song; the latest `@artist:` seen belongs to it (an
/// artist before the first title belongs to the first song, as in the frontend).
pub fn songs(content: &str) -> Vec<Song> {
    let mut songs = Vec::new();
    let mut title: Option<String> = None;
    let mut artist: Option<String> = None;
    for line in content.lines().map(str::trim) {
        if let Some(t) = line.strip_prefix("@title:") {
            if let Some(prev) = title.take() {
                songs.push(Song {
                    title: prev,
                    artist: artist.take(),
                });
            }
            let t = t.trim();
            title = Some(if t.is_empty() { "Untitled Song" } else { t }.to_owned());
        } else if let Some(a) = line.strip_prefix("@artist:") {
            let a = a.trim();
            artist = (!a.is_empty()).then(|| a.to_owned());
        }
    }
    if let Some(t) = title {
        songs.push(Song { title: t, artist });
    }
    songs
}

/// Newline-joined titles/artists of every song, stored for search.
pub struct SongIndex {
    pub titles: String,
    pub artists: String,
}

impl SongIndex {
    pub fn from_content(content: &str) -> Self {
        let songs = songs(content);
        Self {
            titles: songs
                .iter()
                .map(|s| s.title.as_str())
                .collect::<Vec<_>>()
                .join("\n"),
            artists: songs
                .iter()
                .filter_map(|s| s.artist.as_deref())
                .collect::<Vec<_>>()
                .join("\n"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_first_title_and_artist() {
        let c = "  @title: Amazing Grace \n@artist: John Newton\n@title: Second";
        assert_eq!(song_title(c), "Amazing Grace");
        assert_eq!(song_artist(c).as_deref(), Some("John Newton"));
    }

    #[test]
    fn defaults_when_missing_or_blank() {
        assert_eq!(song_title("@title:   \nlyrics"), "Untitled Song");
        assert_eq!(song_artist("@artist:"), None);
    }

    #[test]
    fn extracts_all_songs() {
        let c = "@artist: Early\n@title: One\nla\n@title:\n@title: Three\n@artist: C";
        assert_eq!(
            songs(c),
            [
                Song {
                    title: "One".into(),
                    artist: Some("Early".into())
                },
                Song {
                    title: "Untitled Song".into(),
                    artist: None
                },
                Song {
                    title: "Three".into(),
                    artist: Some("C".into())
                },
            ]
        );
        let idx = SongIndex::from_content(c);
        assert_eq!(idx.titles, "One\nUntitled Song\nThree");
        assert_eq!(idx.artists, "Early\nC");
    }
}
