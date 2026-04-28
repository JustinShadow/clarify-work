use std::fs;
use std::path::PathBuf;
use tauri::State;
use crate::models::{DailyReport, WeeklyReport, MonthlyReport, DailyReportInput, WeeklyReportInput, MonthlyReportInput, Task};
use crate::AppData;
use crate::commands::tasks;

fn reports_dir(state: &AppData) -> PathBuf {
    state.data_dir.join("reports")
}

fn ensure_dir(path: &PathBuf) {
    if !path.exists() {
        fs::create_dir_all(path).unwrap();
    }
}

fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn read_json_file<T: serde::de::DeserializeOwned>(path: &PathBuf) -> Option<T> {
    if !path.exists() { return None; }
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn write_json_file<T: serde::Serialize>(path: &PathBuf, data: &T) {
    let content = serde_json::to_string_pretty(data).unwrap();
    fs::write(path, content).unwrap();
}

fn get_md_dir(state: &AppData, category: &str, date_or_month: &str) -> PathBuf {
    let (year, month) = if category == "monthly" {
        (date_or_month[..4].to_string(), date_or_month[5..7].to_string())
    } else if category == "weekly" {
        let d = chrono::NaiveDate::parse_from_str(date_or_month, "%Y-%m-%d").unwrap_or_else(|_| chrono::Local::now().date_naive());
        (d.format("%Y").to_string(), d.format("%m").to_string())
    } else {
        (date_or_month[..4].to_string(), date_or_month[5..7].to_string())
    };

    let base = state.documents_dir.join("reports").join(&year).join(&month);

    if category == "monthly" {
        ensure_dir(&base);
        base
    } else {
        let dir = base.join(category);
        ensure_dir(&dir);
        dir
    }
}

fn generate_daily_markdown(report: &DailyReport) -> String {
    let mut lines = vec![];
    lines.push(format!("# 📋 日报 - {}", report.date));
    lines.push(String::new());
    lines.push("> 工作管理框架：GTD（任务流） | STAR（成果记录） | PDCA（复盘改进）".to_string());
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## ✅ Done - 今日完成".to_string());
    if report.completed_main.is_empty() && report.completed_side.is_empty() {
        lines.push("- 无".to_string());
    } else {
        for t in &report.completed_main {
            lines.push(format!("- {} [主线] ({}min)", t.title, t.estimated_minutes));
        }
        for t in &report.completed_side {
            lines.push(format!("- {} [支线] ({}min)", t.title, t.estimated_minutes));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 🎯 Next Actions - 进行中".to_string());
    if report.in_progress.is_empty() {
        lines.push("- 无".to_string());
    } else {
        for t in &report.in_progress {
            let blocked_tag = if t.blocked { " ⛔阻塞" } else { "" };
            let progress_tag = if t.progress > 0 { format!(" ({}%)", t.progress) } else { String::new() };
            let type_tag = if t.task_type == "main" { "主线" } else { "支线" };
            lines.push(format!("- {} [{}]{}{}", t.title, type_tag, blocked_tag, progress_tag));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## ⏳ Waiting - 阻塞/依赖".to_string());
    if report.blockers.is_empty() {
        lines.push("- 无".to_string());
    } else {
        for b in &report.blockers {
            lines.push(format!("- {}", b));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 💡 明日计划".to_string());
    if report.tomorrow_plan.is_empty() {
        lines.push("- 待规划".to_string());
    } else {
        for p in &report.tomorrow_plan {
            lines.push(format!("- {}", p));
        }
    }
    if !report.notes.is_empty() {
        lines.push(String::new());
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push("## 📝 补充说明".to_string());
        lines.push(report.notes.clone());
    }
    lines.push(String::new());
    lines.join("\n")
}

fn generate_weekly_markdown(report: &WeeklyReport) -> String {
    let mut lines = vec![];
    lines.push(format!("# 📊 周报 - {} ~ {}", report.week_start, report.week_end));
    lines.push(String::new());
    if !report.summary.is_empty() {
        lines.push("## 📋 概要".to_string());
        lines.push(report.summary.clone());
        lines.push(String::new());
    }
    lines.push("## ✅ 本周亮点".to_string());
    if report.highlights.is_empty() {
        lines.push("- 无".to_string());
    } else {
        let mut unique = report.highlights.clone();
        unique.sort();
        unique.dedup();
        for h in &unique { lines.push(format!("- {}", h)); }
    }
    lines.push(String::new());
    lines.push("## ⚠️ 问题与风险".to_string());
    if report.issues.is_empty() {
        lines.push("- 无".to_string());
    } else {
        let mut unique = report.issues.clone();
        unique.sort();
        unique.dedup();
        for i in &unique { lines.push(format!("- {}", i)); }
    }
    lines.push(String::new());
    lines.push("## 💡 下周计划".to_string());
    if report.next_week_plan.is_empty() {
        lines.push("- 待规划".to_string());
    } else {
        for p in &report.next_week_plan { lines.push(format!("- {}", p)); }
    }
    if !report.daily_reports.is_empty() {
        lines.push(String::new());
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push("## 每日详情".to_string());
        for dr in &report.daily_reports {
            lines.push(format!("### {}", dr.date));
            let completed: Vec<&Task> = dr.completed_main.iter().chain(dr.completed_side.iter()).collect();
            for t in &completed { lines.push(format!("- [x] {}", t.title)); }
            for t in &dr.in_progress { lines.push(format!("- [ ] {} (进行中)", t.title)); }
            lines.push(String::new());
        }
    }
    lines.join("\n")
}

fn generate_monthly_markdown(report: &MonthlyReport) -> String {
    let mut lines = vec![];
    lines.push(format!("# 📈 月报 - {}", report.month));
    lines.push(String::new());
    if !report.summary.is_empty() {
        lines.push("## 📋 概要".to_string());
        lines.push(report.summary.clone());
        lines.push(String::new());
    }
    lines.push("## 🌟 本月亮点".to_string());
    if report.highlights.is_empty() {
        lines.push("- 无".to_string());
    } else {
        for h in &report.highlights { lines.push(format!("- {}", h)); }
    }
    lines.push(String::new());
    lines.push("## ⚠️ 问题与风险".to_string());
    if report.issues.is_empty() {
        lines.push("- 无".to_string());
    } else {
        for i in &report.issues { lines.push(format!("- {}", i)); }
    }
    lines.push(String::new());
    lines.push("## 🚀 下月展望".to_string());
    if report.next_month_plan.is_empty() {
        lines.push("- 待规划".to_string());
    } else {
        for p in &report.next_month_plan { lines.push(format!("- {}", p)); }
    }
    if !report.weekly_reports.is_empty() {
        lines.push(String::new());
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push("## 周报详情".to_string());
        for wr in &report.weekly_reports {
            lines.push(format!("### {} ~ {}", wr.week_start, wr.week_end));
            for h in &wr.highlights { lines.push(format!("- {}", h)); }
            lines.push(String::new());
        }
    }
    lines.join("\n")
}

#[tauri::command]
pub fn list_daily_reports(state: State<AppData>) -> Vec<DailyReport> {
    let dir = reports_dir(&state).join("daily");
    ensure_dir(&dir);
    let Ok(entries) = fs::read_dir(&dir) else { return vec![]; };
    let mut reports: Vec<DailyReport> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "json").unwrap_or(false))
        .filter_map(|e| read_json_file::<DailyReport>(&e.path()))
        .collect();
    reports.sort_by(|a, b| b.date.cmp(&a.date));
    reports
}

#[tauri::command]
pub fn get_daily_report(state: State<AppData>, date: String) -> Result<DailyReport, String> {
    let path = reports_dir(&state).join("daily").join(format!("{}.json", date));
    read_json_file::<DailyReport>(&path).ok_or_else(|| "Report not found".to_string())
}

#[tauri::command]
pub fn generate_daily_report(state: State<AppData>, input: DailyReportInput) -> Result<DailyReport, String> {
    let date = input.date.unwrap_or_else(|| today());
    let tasks = tasks::read_tasks_from_state(&state);
    let now = now_iso();

    let completed_main: Vec<Task> = tasks.iter().filter(|t| t.task_type == "main" && t.status == "done" && t.completed_at.as_deref().map(|c| c.starts_with(&date)).unwrap_or(false)).cloned().collect();
    let completed_side: Vec<Task> = tasks.iter().filter(|t| t.task_type == "side" && t.status == "done" && t.completed_at.as_deref().map(|c| c.starts_with(&date)).unwrap_or(false)).cloned().collect();
    let in_progress: Vec<Task> = tasks.iter().filter(|t| t.status == "in_progress").cloned().collect();
    let todo: Vec<Task> = tasks.iter().filter(|t| t.status == "todo").cloned().collect();

    let auto_blockers: Vec<String> = tasks.iter()
        .filter(|t| t.blocked && !t.blocked_reason.is_empty())
        .map(|t| format!("{}：{}", t.title, t.blocked_reason))
        .collect();
    let mut blockers = auto_blockers;
    if let Some(user_blockers) = input.blockers {
        blockers.extend(user_blockers);
    }

    let report = DailyReport {
        date,
        completed_main,
        completed_side,
        in_progress,
        todo,
        tomorrow_plan: input.tomorrow_plan.unwrap_or_default(),
        blockers,
        notes: input.notes.unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };

    let dir = reports_dir(&state).join("daily");
    ensure_dir(&dir);
    write_json_file(&dir.join(format!("{}.json", report.date)), &report);

    let md = generate_daily_markdown(&report);
    let md_path = get_md_dir(&state, "daily", &report.date);
    fs::write(md_path.join(format!("{}.md", report.date)), md).unwrap();

    Ok(report)
}

#[tauri::command]
pub fn update_daily_report(state: State<AppData>, date: String, data: DailyReportInput) -> Result<DailyReport, String> {
    let path = reports_dir(&state).join("daily").join(format!("{}.json", date));
    let mut existing: DailyReport = read_json_file::<DailyReport>(&path).ok_or("Report not found")?;
    let now = now_iso();
    if let Some(tomorrow_plan) = data.tomorrow_plan { existing.tomorrow_plan = tomorrow_plan; }
    if let Some(blockers) = data.blockers { existing.blockers = blockers; }
    if let Some(notes) = data.notes { existing.notes = notes; }
    existing.updated_at = now;
    write_json_file(&path, &existing);

    let md = generate_daily_markdown(&existing);
    let md_path = get_md_dir(&state, "daily", &date);
    fs::write(md_path.join(format!("{}.md", date)), md).unwrap();

    Ok(existing)
}

#[tauri::command]
pub fn list_weekly_reports(state: State<AppData>) -> Vec<WeeklyReport> {
    let dir = reports_dir(&state).join("weekly");
    ensure_dir(&dir);
    let Ok(entries) = fs::read_dir(&dir) else { return vec![]; };
    let mut reports: Vec<WeeklyReport> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "json").unwrap_or(false))
        .filter_map(|e| read_json_file::<WeeklyReport>(&e.path()))
        .collect();
    reports.sort_by(|a, b| b.week_start.cmp(&a.week_start));
    reports
}

#[tauri::command]
pub fn generate_weekly_report(state: State<AppData>, input: WeeklyReportInput) -> Result<WeeklyReport, String> {
    let now = now_iso();
    let daily_dir = reports_dir(&state).join("daily");
    ensure_dir(&daily_dir);
    let Ok(entries) = fs::read_dir(&daily_dir) else { return Err("No daily reports".to_string()); };

    let mut daily_reports = vec![];
    for entry in entries.flatten() {
        if let Some(report) = read_json_file::<DailyReport>(&entry.path()) {
            if report.date >= input.week_start && report.date <= input.week_end {
                daily_reports.push(report);
            }
        }
    }

    let highlights: Vec<String> = daily_reports.iter().flat_map(|r| r.completed_main.iter().map(|t| t.title.clone())).collect();
    let issues: Vec<String> = daily_reports.iter().flat_map(|r| r.blockers.clone()).collect();

    let report = WeeklyReport {
        week_start: input.week_start,
        week_end: input.week_end,
        daily_reports,
        summary: input.summary.unwrap_or_default(),
        highlights,
        issues,
        next_week_plan: input.next_week_plan.unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };

    let dir = reports_dir(&state).join("weekly");
    ensure_dir(&dir);
    write_json_file(&dir.join(format!("{}.json", report.week_start)), &report);

    let md = generate_weekly_markdown(&report);
    let md_path = get_md_dir(&state, "weekly", &report.week_start);
    fs::write(md_path.join(format!("{}.md", report.week_start)), md).unwrap();

    Ok(report)
}

#[tauri::command]
pub fn list_monthly_reports(state: State<AppData>) -> Vec<MonthlyReport> {
    let dir = reports_dir(&state).join("monthly");
    ensure_dir(&dir);
    let Ok(entries) = fs::read_dir(&dir) else { return vec![]; };
    let mut reports: Vec<MonthlyReport> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "json").unwrap_or(false))
        .filter_map(|e| read_json_file::<MonthlyReport>(&e.path()))
        .collect();
    reports.sort_by(|a, b| b.month.cmp(&a.month));
    reports
}

#[tauri::command]
pub fn generate_monthly_report(state: State<AppData>, input: MonthlyReportInput) -> Result<MonthlyReport, String> {
    let now = now_iso();
    let weekly_dir = reports_dir(&state).join("weekly");
    ensure_dir(&weekly_dir);
    let Ok(entries) = fs::read_dir(&weekly_dir) else { return Err("No weekly reports".to_string()); };

    let mut weekly_reports = vec![];
    for entry in entries.flatten() {
        if let Some(report) = read_json_file::<WeeklyReport>(&entry.path()) {
            if report.week_start.starts_with(&input.month) {
                weekly_reports.push(report);
            }
        }
    }

    let mut highlights: Vec<String> = weekly_reports.iter().flat_map(|r| r.highlights.clone()).collect();
    highlights.sort();
    highlights.dedup();
    let mut issues: Vec<String> = weekly_reports.iter().flat_map(|r| r.issues.clone()).collect();
    issues.sort();
    issues.dedup();

    let report = MonthlyReport {
        month: input.month,
        weekly_reports,
        summary: input.summary.unwrap_or_default(),
        highlights,
        issues,
        next_month_plan: input.next_month_plan.unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };

    let dir = reports_dir(&state).join("monthly");
    ensure_dir(&dir);
    write_json_file(&dir.join(format!("{}.json", report.month)), &report);

    let md = generate_monthly_markdown(&report);
    let md_path = get_md_dir(&state, "monthly", &report.month);
    fs::write(md_path.join(format!("{}.md", report.month)), md).unwrap();

    Ok(report)
}
