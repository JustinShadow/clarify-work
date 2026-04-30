use std::path::PathBuf;
use tauri::Manager;

pub struct AppData {
    data_dir: PathBuf,
    config_dir: PathBuf,
    documents_dir: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap();
            let data_dir = app_data_dir.join("data");
            let config_dir = app_data_dir.join("config");
            let documents_dir = dirs::document_dir()
                .unwrap_or_else(|| app_data_dir.clone())
                .join("Workflow");

            std::fs::create_dir_all(&data_dir).unwrap();
            std::fs::create_dir_all(&config_dir).unwrap();
            std::fs::create_dir_all(data_dir.join("reports").join("daily")).unwrap();
            std::fs::create_dir_all(data_dir.join("reports").join("weekly")).unwrap();
            std::fs::create_dir_all(data_dir.join("reports").join("monthly")).unwrap();
            std::fs::create_dir_all(data_dir.join("reports").join("morning-plan")).unwrap();
            std::fs::create_dir_all(documents_dir.join("reports")).unwrap();

            app.manage(AppData { data_dir, config_dir, documents_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::tasks::list_tasks,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::delete_task,
            commands::tasks::get_stats,
            commands::tags::list_tags,
            commands::tags::add_tags,
            commands::tags::remove_tag,
            commands::reports::list_morning_plans,
            commands::reports::get_morning_plan,
            commands::reports::generate_morning_plan,
            commands::reports::update_morning_plan,
            commands::reports::list_daily_reports,
            commands::reports::get_daily_report,
            commands::reports::generate_daily_report,
            commands::reports::update_daily_report,
            commands::reports::delete_daily_report,
            commands::reports::list_weekly_reports,
            commands::reports::generate_weekly_report,
            commands::reports::delete_weekly_report,
            commands::reports::list_monthly_reports,
            commands::reports::generate_monthly_report,
            commands::reports::delete_monthly_report,
            commands::llm::get_llm_config,
            commands::llm::update_llm_config,
            commands::llm::test_llm,
            commands::llm::llm_stream_generate,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod commands;
mod models;
