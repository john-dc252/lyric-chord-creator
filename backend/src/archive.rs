//! Zip archive of templates as `.lcct.txt` files (same naming as the frontend export).

use std::{
    collections::HashSet,
    io::{Cursor, Write},
};

use chrono::{DateTime, Datelike, Timelike, Utc};
use zip::{CompressionMethod, ZipWriter, write::SimpleFileOptions};

pub struct Entry<'a> {
    pub name: &'a str,
    pub content: &'a str,
    pub modified: DateTime<Utc>,
}

/// Mirrors `exportTemplateAsFile`: lowercase, non-alphanumerics → `-`.
fn base_name(name: &str) -> String {
    let mut out = String::new();
    for c in name.to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else if !out.ends_with('-') {
            out.push('-');
        }
    }
    let trimmed = out.trim_matches('-');
    if trimmed.is_empty() {
        "lyric-chord-template".into()
    } else {
        trimmed.into()
    }
}

fn zip_time(t: DateTime<Utc>) -> zip::DateTime {
    zip::DateTime::from_date_and_time(
        t.year().clamp(1980, 2107) as u16,
        t.month() as u8,
        t.day() as u8,
        t.hour() as u8,
        t.minute() as u8,
        t.second() as u8,
    )
    .unwrap_or_default()
}

pub fn build(entries: &[Entry]) -> zip::result::ZipResult<Vec<u8>> {
    let mut zip = ZipWriter::new(Cursor::new(Vec::new()));
    let mut used = HashSet::new();
    for e in entries {
        let base = base_name(e.name);
        let file = (1..)
            .map(|n| match n {
                1 => format!("{base}.lcct.txt"),
                n => format!("{base}-{n}.lcct.txt"),
            })
            .find(|f| used.insert(f.clone()))
            .expect("unbounded");
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .last_modified_time(zip_time(e.modified));
        zip.start_file(file, options)?;
        zip.write_all(e.content.as_bytes())?;
    }
    Ok(zip.finish()?.into_inner())
}

#[cfg(test)]
mod tests {
    use std::io::Read;

    use super::*;

    #[test]
    fn names_files_like_frontend_and_dedupes() {
        assert_eq!(base_name("Amazing Grace (Live)!"), "amazing-grace-live");
        assert_eq!(base_name("日本語"), "lyric-chord-template");

        let now = Utc::now();
        let entries = [
            Entry {
                name: "Hymn",
                content: "@title: A",
                modified: now,
            },
            Entry {
                name: "hymn!",
                content: "@title: B",
                modified: now,
            },
            Entry {
                name: "日本語",
                content: "x",
                modified: now,
            },
        ];
        let bytes = build(&entries).unwrap();
        let mut archive = zip::ZipArchive::new(Cursor::new(bytes)).unwrap();
        let names: Vec<_> = archive.file_names().map(str::to_owned).collect();
        let mut sorted = names.clone();
        sorted.sort();
        assert_eq!(
            sorted,
            [
                "hymn-2.lcct.txt",
                "hymn.lcct.txt",
                "lyric-chord-template.lcct.txt"
            ]
        );

        let mut content = String::new();
        archive
            .by_name("hymn-2.lcct.txt")
            .unwrap()
            .read_to_string(&mut content)
            .unwrap();
        assert_eq!(content, "@title: B");
    }
}
