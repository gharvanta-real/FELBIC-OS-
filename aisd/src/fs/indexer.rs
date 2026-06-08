use anyhow::Result;
use rusqlite::{params, Connection};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Serialize, Clone, Debug)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub score: f64,
}

pub fn rebuild_index(root: &Path) -> Result<usize> {
    let db_path = index_path();
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(db_path)?;
    init_schema(&conn)?;
    conn.execute("DELETE FROM files", [])?;

    let mut count = 0;
    index_dir(&conn, root, root, &mut count)?;
    Ok(count)
}

pub fn search(root: &Path, query: &str, limit: usize) -> Result<Vec<SearchResult>> {
    let db_path = index_path();
    if !db_path.exists() {
        let _ = rebuild_index(root)?;
    }

    let conn = Connection::open(db_path)?;
    init_schema(&conn)?;

    let normalized_query = query.trim().to_lowercase();
    if normalized_query.is_empty() {
        return Ok(Vec::new());
    }

    let like = format!("%{}%", normalized_query.replace('%', "\\%").replace('_', "\\_"));
    let mut stmt = conn.prepare(
        "SELECT path, name, is_dir, size,
                CASE
                    WHEN lower(name) = ?1 THEN 100.0
                    WHEN lower(name) LIKE ?2 THEN 75.0
                    WHEN lower(path) LIKE ?2 THEN 55.0
                    ELSE 10.0
                END AS score
         FROM files
         WHERE lower(name) LIKE ?2 OR lower(path) LIKE ?2
         ORDER BY score DESC, mtime DESC
         LIMIT ?3",
    )?;

    let rows = stmt.query_map(params![normalized_query, like, limit as i64], |row| {
        Ok(SearchResult {
            path: row.get(0)?,
            name: row.get(1)?,
            is_dir: row.get::<_, i64>(2)? != 0,
            size: row.get::<_, i64>(3)? as u64,
            score: row.get(4)?,
        })
    })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

fn init_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS files (
            path TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            is_dir INTEGER NOT NULL,
            size INTEGER NOT NULL,
            mtime INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
        CREATE INDEX IF NOT EXISTS idx_files_mtime ON files(mtime);",
    )?;
    Ok(())
}

fn index_dir(conn: &Connection, root: &Path, dir: &Path, count: &mut usize) -> Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let metadata = entry.metadata()?;
        let rel = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        let name = entry.file_name().to_string_lossy().to_string();
        let mtime = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or_default();

        conn.execute(
            "INSERT OR REPLACE INTO files(path, name, is_dir, size, mtime)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                rel,
                name,
                if metadata.is_dir() { 1 } else { 0 },
                metadata.len() as i64,
                mtime
            ],
        )?;
        *count += 1;

        if metadata.is_dir() && should_descend(&path) {
            let _ = index_dir(conn, root, &path, count);
        }
    }
    Ok(())
}

fn should_descend(path: &Path) -> bool {
    let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
    !matches!(
        name,
        ".git" | "target" | "node_modules" | ".cache" | ".local/share/Trash"
    )
}

fn index_path() -> PathBuf {
    std::env::var("AISD_INDEX_DB")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            std::env::var("HOME")
                .map(|home| PathBuf::from(home).join(".local/share/aios/index.db"))
                .unwrap_or_else(|_| PathBuf::from("/var/lib/aios/index.db"))
        })
}
