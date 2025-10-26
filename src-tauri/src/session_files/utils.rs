use chrono::NaiveDateTime;
use std::fs::File;
use std::io::{self, BufRead, BufReader};
use std::path::PathBuf;

pub fn count_lines(file_path: &PathBuf) -> io::Result<usize> {
    let file = File::open(file_path)?;
    let reader = BufReader::new(file);
    Ok(reader.lines().count())
}

pub fn extract_datetime(path_str: &str) -> Option<NaiveDateTime> {
    let parts: Vec<&str> = path_str.split('/').collect();
    if parts.len() < 5 {
        return None;
    }
    let year = parts[parts.len() - 4];
    let month = parts[parts.len() - 3];
    let day = parts[parts.len() - 2];
    let filename = parts.last().unwrap_or(&"");
    let time_part = filename
        .split('T')
        .nth(1)
        .and_then(|s| Some(s.split('-').take(3).collect::<Vec<_>>().join("-")))
        .unwrap_or_default();
    let datetime_str = format!("{}-{}-{}T{}", year, month, day, time_part);
    NaiveDateTime::parse_from_str(&datetime_str, "%Y-%m-%dT%H-%M-%S").ok()
}
