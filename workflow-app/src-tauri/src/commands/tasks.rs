use std::fs;
use std::path::PathBuf;
use tauri::State;
use crate::models::{Task, TaskInput, Stats};
use crate::AppData;

pub fn data_dir_from_state(state: &AppData) -> PathBuf {
    state.data_dir.clone()
}

pub fn read_tasks_from_state(state: &AppData) -> Vec<Task> {
    let path = data_dir_from_state(state).join("tasks.json");
    if !path.exists() { return vec![]; }
    let content = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}

fn write_tasks(state: &AppData, tasks: &[Task]) {
    let path = data_dir_from_state(state).join("tasks.json");
    let content = serde_json::to_string_pretty(tasks).unwrap();
    fs::write(&path, content).unwrap();
}

fn sync_tags(state: &AppData, new_tags: &[String]) {
    let tags_path = data_dir_from_state(state).join("tags.json");
    let mut existing: Vec<String> = if tags_path.exists() {
        let content = fs::read_to_string(&tags_path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        vec![]
    };
    let mut changed = false;
    for tag in new_tags {
        if !existing.contains(tag) {
            existing.push(tag.clone());
            changed = true;
        }
    }
    if changed {
        let content = serde_json::to_string_pretty(&existing).unwrap();
        fs::write(&tags_path, content).unwrap();
    }
}

fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[tauri::command]
pub fn list_tasks(state: State<AppData>) -> Vec<Task> {
    read_tasks_from_state(&state)
}

#[tauri::command]
pub fn create_task(state: State<AppData>, task: TaskInput) -> Result<Task, String> {
    let mut tasks = read_tasks_from_state(&state);
    let now = now_iso();
    let new_task = Task {
        id: uuid::Uuid::new_v4().to_string(),
        title: task.title.unwrap_or_default(),
        description: task.description.unwrap_or_default(),
        task_type: task.task_type.unwrap_or_else(|| "main".to_string()),
        priority: task.priority.unwrap_or_else(|| "P2".to_string()),
        status: task.status.unwrap_or_else(|| "todo".to_string()),
        progress: task.progress.unwrap_or(0),
        blocked: task.blocked.unwrap_or(false),
        blocked_reason: task.blocked_reason.unwrap_or_default(),
        estimated_minutes: task.estimated_minutes.unwrap_or(30),
        deadline: task.deadline.flatten(),
        created_at: now.clone(),
        updated_at: now,
        completed_at: None,
        tags: task.tags.unwrap_or_default(),
    };
    if !new_task.tags.is_empty() {
        sync_tags(&state, &new_task.tags);
    }
    tasks.push(new_task.clone());
    write_tasks(&state, &tasks);
    Ok(new_task)
}

#[tauri::command]
pub fn update_task(state: State<AppData>, id: String, task: TaskInput) -> Result<Task, String> {
    let mut tasks = read_tasks_from_state(&state);
    let idx = tasks.iter().position(|t| t.id == id).ok_or("Task not found")?;
    let now = now_iso();
    let existing = &tasks[idx];
    let completed_at = if task.status.as_deref() == Some("done") && existing.completed_at.is_none() {
        Some(now.clone())
    } else {
        existing.completed_at.clone()
    };
    let status = task.status.clone().unwrap_or_else(|| existing.status.clone());
    let progress = if status == "done" { 100 } else { task.progress.unwrap_or(existing.progress) };
    let blocked = if status == "done" { false } else { task.blocked.unwrap_or(existing.blocked) };
    let blocked_reason = if status == "done" { String::new() } else { task.blocked_reason.clone().unwrap_or_else(|| existing.blocked_reason.clone()) };

    let updated = Task {
        id: existing.id.clone(),
        title: task.title.unwrap_or_else(|| existing.title.clone()),
        description: task.description.unwrap_or_else(|| existing.description.clone()),
        task_type: task.task_type.unwrap_or_else(|| existing.task_type.clone()),
        priority: task.priority.unwrap_or_else(|| existing.priority.clone()),
        status: status.clone(),
        progress,
        blocked,
        blocked_reason,
        estimated_minutes: task.estimated_minutes.unwrap_or(existing.estimated_minutes),
        deadline: if task.deadline.is_some() { task.deadline.flatten() } else { existing.deadline.clone() },
        created_at: existing.created_at.clone(),
        updated_at: now,
        completed_at: if status != "done" { None } else { completed_at },
        tags: task.tags.unwrap_or_else(|| existing.tags.clone()),
    };
    if !updated.tags.is_empty() {
        sync_tags(&state, &updated.tags);
    }
    tasks[idx] = updated.clone();
    write_tasks(&state, &tasks);
    Ok(updated)
}

#[tauri::command]
pub fn delete_task(state: State<AppData>, id: String) -> Result<bool, String> {
    let tasks = read_tasks_from_state(&state);
    let filtered: Vec<Task> = tasks.into_iter().filter(|t| t.id != id).collect();
    write_tasks(&state, &filtered);
    Ok(true)
}

#[tauri::command]
pub fn get_stats(state: State<AppData>) -> Stats {
    let tasks = read_tasks_from_state(&state);
    let today_str = today();
    let total_estimated: i32 = tasks.iter().filter(|t| t.status != "done").map(|t| t.estimated_minutes).sum();
    let completed_today = tasks.iter().filter(|t| t.status == "done" && t.completed_at.as_deref().map(|c| c.starts_with(&today_str)).unwrap_or(false)).count();
    let overdue_tasks: Vec<Task> = tasks.iter().filter(|t| {
        t.status != "done" && t.deadline.as_deref().map(|d| *d < *today_str).unwrap_or(false)
    }).cloned().collect();

    Stats {
        total: tasks.len(),
        todo: tasks.iter().filter(|t| t.status == "todo").count(),
        in_progress: tasks.iter().filter(|t| t.status == "in_progress").count(),
        blocked: tasks.iter().filter(|t| t.blocked).count(),
        done: tasks.iter().filter(|t| t.status == "done").count(),
        total_estimated_minutes: total_estimated,
        completed_today,
        overdue_count: overdue_tasks.len(),
        overdue_tasks,
        main_count: tasks.iter().filter(|t| t.task_type == "main" && t.status != "done").count(),
        side_count: tasks.iter().filter(|t| t.task_type == "side" && t.status != "done").count(),
    }
}
