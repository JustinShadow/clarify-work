use std::fs;
use std::path::PathBuf;
use tauri::State;
use crate::AppData;

fn tags_file(state: &AppData) -> PathBuf {
    state.data_dir.join("tags.json")
}

fn read_tags(state: &AppData) -> Vec<String> {
    let path = tags_file(state);
    if !path.exists() { return vec![]; }
    let content = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}

fn write_tags(state: &AppData, tags: &[String]) {
    let path = tags_file(state);
    let content = serde_json::to_string_pretty(tags).unwrap();
    fs::write(&path, content).unwrap();
}

#[tauri::command]
pub fn list_tags(state: State<AppData>) -> Vec<String> {
    read_tags(&state)
}

#[tauri::command]
pub fn add_tags(state: State<AppData>, tags: Vec<String>) -> Vec<String> {
    let mut existing = read_tags(&state);
    for tag in &tags {
        if !existing.contains(tag) {
            existing.push(tag.clone());
        }
    }
    write_tags(&state, &existing);
    existing
}

#[tauri::command]
pub fn remove_tag(state: State<AppData>, name: String) -> Vec<String> {
    let existing = read_tags(&state);
    let filtered: Vec<String> = existing.into_iter().filter(|t| t != &name).collect();
    write_tags(&state, &filtered);
    filtered
}
