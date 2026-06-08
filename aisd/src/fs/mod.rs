pub mod watcher;
pub mod indexer;

use std::fs;
use std::env;
use std::path::{Path, PathBuf};
use anyhow::{Result, anyhow};
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct FileItem {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

pub fn get_fs_root() -> PathBuf {
    if let Ok(root_env) = env::var("AISD_FS_ROOT") {
        let path = PathBuf::from(root_env);
        let _ = fs::create_dir_all(&path);
        path
    } else {
        let path = PathBuf::from("/home/felbic");
        if path.exists() {
            path
        } else {
            // Non-Linux or system where /home/felbic does not exist:
            // use a local directory to avoid failure.
            let local_path = env::current_dir().unwrap_or_default().join("felbic_home");
            let _ = fs::create_dir_all(&local_path);
            local_path
        }
    }
}

pub fn get_secure_path(root: &Path, user_path: &str) -> Result<PathBuf> {
    // 1. Canonicalize the root. It must exist.
    let canonical_root = root.canonicalize()
        .map_err(|e| anyhow!("Failed to canonicalize root path {:?}: {}", root, e))?;

    // 2. Join root and user_path
    let joined = root.join(user_path);

    // 3. Resolve the path. We can use canonicalize if it exists, or canonicalize the parent.
    let resolved = if joined.exists() {
        joined.canonicalize()
            .map_err(|e| anyhow!("Failed to canonicalize target path: {}", e))?
    } else {
        // Find the first existing parent directory
        let mut parent = joined.as_path();
        while let Some(p) = parent.parent() {
            if p.exists() {
                parent = p;
                break;
            }
            parent = p;
        }
        let canonical_parent = parent.canonicalize()
            .map_err(|e| anyhow!("Failed to canonicalize parent path: {}", e))?;
            
        if !canonical_parent.starts_with(&canonical_root) {
            return Err(anyhow!("Access denied: Path lies outside root directory"));
        }
        
        // Normalize the joined path to prevent ".." hacks in non-existent parts
        let mut components = Vec::new();
        for component in joined.components() {
            match component {
                std::path::Component::ParentDir => {
                    components.pop();
                }
                std::path::Component::Normal(c) => {
                    components.push(c);
                }
                std::path::Component::CurDir => {}
                _ => {}
            }
        }
        let normalized: PathBuf = components.into_iter().collect();
        if !normalized.starts_with(root) {
            return Err(anyhow!("Access denied: Path lies outside root directory"));
        }
        joined
    };

    if !resolved.starts_with(&canonical_root) {
        return Err(anyhow!("Access denied: Path lies outside root directory"));
    }

    Ok(resolved)
}

pub fn list_files(sub_path: &str) -> Result<Vec<FileItem>> {
    let root = get_fs_root();
    let target_path = get_secure_path(&root, sub_path)?;
    
    let mut items = Vec::new();
    let entries = fs::read_dir(target_path)?;
    for entry in entries {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let file_name = entry.file_name().to_string_lossy().into_owned();
        items.push(FileItem {
            name: file_name,
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }
    Ok(items)
}

pub fn read_file_content(sub_path: &str) -> Result<String> {
    let root = get_fs_root();
    let target_path = get_secure_path(&root, sub_path)?;
    if !target_path.is_file() {
        return Err(anyhow!("Path is not a file"));
    }
    let content = fs::read_to_string(target_path)?;
    Ok(content)
}

pub fn write_file_content(sub_path: &str, content: &str) -> Result<()> {
    let root = get_fs_root();
    let target_path = get_secure_path(&root, sub_path)?;
    
    // Ensure parent directory exists
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)?;
    }
    
    fs::write(target_path, content)?;
    Ok(())
}

pub fn rebuild_index() -> Result<usize> {
    let root = get_fs_root();
    indexer::rebuild_index(&root)
}

pub fn search_files(query: &str, limit: usize) -> Result<Vec<indexer::SearchResult>> {
    let root = get_fs_root();
    indexer::search(&root, query, limit)
}
