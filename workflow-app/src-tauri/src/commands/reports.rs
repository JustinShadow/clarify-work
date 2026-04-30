use std::fs;
use std::path::PathBuf;
use tauri::State;
use crate::models::*;
use crate::AppData;
use crate::commands::tasks;

#[derive(serde::Deserialize)]
struct ReportTemplate {
    title: String,
    subtitle: String,
    sections: Vec<TemplateSection>,
}

#[derive(serde::Deserialize)]
struct TemplateSection {
    id: String,
    heading: String,
    #[serde(default, rename = "type")]
    section_type: Option<String>,
    columns: Option<Vec<String>>,
    empty_row: Option<Vec<String>>,
    empty_item: Option<String>,
    static_rows: Option<Vec<Vec<String>>>,
    rows: Option<Vec<Vec<String>>>,
    fields: Option<serde_json::Value>,
    sub_sections: Option<Vec<TemplateSection>>,
    placeholder: Option<String>,
    default_title: Option<String>,
    items: Option<Vec<TemplateListItem>>,
}

#[derive(serde::Deserialize)]
struct TemplateListItem {
    label: String,
    empty_item: String,
}

const MORNING_PLAN_TEMPLATE: &str = include_str!("../../../../shared/templates/morning-plan.json");
const DAILY_REPORT_TEMPLATE: &str = include_str!("../../../../shared/templates/daily-report.json");
const WEEKLY_REPORT_TEMPLATE: &str = include_str!("../../../../shared/templates/weekly-report.json");
const MONTHLY_REPORT_TEMPLATE: &str = include_str!("../../../../shared/templates/monthly-report.json");

fn load_template(name: &str) -> ReportTemplate {
    let content = match name {
        "morning-plan" => MORNING_PLAN_TEMPLATE,
        "daily-report" => DAILY_REPORT_TEMPLATE,
        "weekly-report" => WEEKLY_REPORT_TEMPLATE,
        "monthly-report" => MONTHLY_REPORT_TEMPLATE,
        _ => panic!("Unknown template: {}", name),
    };
    serde_json::from_str(content).expect(&format!("Failed to parse template: {}", name))
}

fn find_section<'a>(sections: &'a [TemplateSection], id: &str) -> &'a TemplateSection {
    sections.iter().find(|s| s.id == id).expect(&format!("Section '{}' not found in template", id))
}

fn render_table_header(columns: &[String]) -> Vec<String> {
    let mut lines = vec![];
    lines.push(format!("| {} |", columns.join(" | ")));
    lines.push(format!("|{}|", columns.iter().map(|_| "---").collect::<Vec<_>>().join("|")));
    lines
}

fn render_empty_row(empty_row: &[String]) -> String {
    format!("| {} |", empty_row.join(" | "))
}

pub fn reports_dir(state: &AppData) -> PathBuf {
    state.data_dir.join("reports")
}

fn ensure_dir(path: &PathBuf) {
    if !path.exists() {
        fs::create_dir_all(path).unwrap();
    }
}

pub fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

pub fn yesterday(date: &str) -> String {
    chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map(|d| (d - chrono::Duration::days(1)).format("%Y-%m-%d").to_string())
        .unwrap_or_else(|_| today())
}

pub fn read_json_file<T: serde::de::DeserializeOwned>(path: &PathBuf) -> Option<T> {
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

// ========== Morning Plan Markdown ==========

fn generate_morning_plan_markdown(plan: &MorningPlan) -> String {
    let tpl = load_template("morning-plan");
    let mut lines = vec![];
    lines.push(tpl.title.replace("{{date}}", &plan.date));
    lines.push(String::new());
    lines.push(tpl.subtitle.clone());
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let yesterday_section = find_section(&tpl.sections, "yesterdayUnfinished");
    lines.push(yesterday_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &yesterday_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    if plan.yesterday_completed.is_empty() {
        if let Some(empty) = &yesterday_section.empty_row {
            lines.push(render_empty_row(empty));
        }
    } else {
        for (i, t) in plan.yesterday_completed.iter().enumerate() {
            lines.push(format!("| {} | {} | - | - |", i + 1, t));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let inbox_section = find_section(&tpl.sections, "inbox");
    lines.push(inbox_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &inbox_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    if plan.inbox.is_empty() {
        if let Some(empty) = &inbox_section.empty_row {
            lines.push(render_empty_row(empty));
        }
    } else {
        for (i, t) in plan.inbox.iter().enumerate() {
            lines.push(format!("| {} | {} | - | - | - | 可直接开始 |", i + 1, t));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let actions_section = find_section(&tpl.sections, "nextActions");
    lines.push(actions_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &actions_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    for (i, t) in plan.next_actions.iter().enumerate() {
        let blocked_tag = if t.blocked { " ⛔" } else { "" };
        let type_label = if t.task_type == "main" { "主线" } else { "支线" };
        let is_continue = plan.yesterday_unfinished.iter().any(|y| y.title == t.title);
        let cont_label = if is_continue { "续" } else { "新" };
        lines.push(format!("| {} | {}{} | {} | {}({}) | {}min | - |", i + 1, t.title, blocked_tag, t.priority, type_label, cont_label, t.estimated_minutes));
    }
    if plan.next_actions.is_empty() {
        if let Some(empty) = &actions_section.empty_row {
            lines.push(render_empty_row(empty));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let waiting_section = find_section(&tpl.sections, "waiting");
    lines.push(waiting_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &waiting_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    if plan.yesterday_blockers.is_empty() {
        if let Some(empty) = &waiting_section.empty_row {
            lines.push(render_empty_row(empty));
        }
    } else {
        for (i, b) in plan.yesterday_blockers.iter().enumerate() {
            lines.push(format!("| {} | {} | - | 待确认 | 验证测试 |", i + 1, b));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let risks_section = find_section(&tpl.sections, "risks");
    lines.push(risks_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &risks_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    let blocked: Vec<&NextAction> = plan.next_actions.iter().filter(|t| t.blocked).collect();
    if blocked.is_empty() {
        if let Some(empty) = &risks_section.empty_row {
            lines.push(render_empty_row(empty));
        }
    } else {
        for (i, t) in blocked.iter().enumerate() {
            lines.push(format!("| {} | {}持续阻塞 | 影响进度 | 若持续阻塞则转入其他任务 |", i + 1, t.title));
        }
    }
    lines.push(String::new());

    if !plan.llm_content.is_empty() {
        let llm_section = find_section(&tpl.sections, "llmContent");
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push(llm_section.heading.clone());
        lines.push(plan.llm_content.clone());
        lines.push(String::new());
    }
    lines.join("\n")
}

// ========== Daily Report Markdown ==========

fn generate_daily_markdown(report: &DailyReport) -> String {
    let tpl = load_template("daily-report");
    let mut lines = vec![];
    lines.push(tpl.title.replace("{{date}}", &report.date));
    lines.push(String::new());
    lines.push(tpl.subtitle.clone());
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let inbox_section = find_section(&tpl.sections, "inbox");
    lines.push(inbox_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &inbox_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    if report.inbox.is_empty() {
        if let Some(empty) = &inbox_section.empty_row { lines.push(render_empty_row(empty)); }
    } else {
        for (i, t) in report.inbox.iter().enumerate() {
            lines.push(format!("| {} | {} | - | - |", i + 1, t));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let actions_section = find_section(&tpl.sections, "nextActions");
    lines.push(actions_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &actions_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    let all_active: Vec<&Task> = report.in_progress.iter().chain(report.todo.iter()).collect();
    if all_active.is_empty() {
        if let Some(empty) = &actions_section.empty_row { lines.push(render_empty_row(empty)); }
    } else {
        for (i, t) in all_active.iter().enumerate() {
            let blocked_tag = if t.blocked { " ⛔阻塞" } else { "" };
            let progress_tag = if t.progress > 0 { format!(" ({}%)", t.progress) } else { String::new() };
            let status_label = if t.status == "in_progress" { "进行中" } else { "待办" };
            let type_label = if t.task_type == "main" { "主线" } else { "支线" };
            lines.push(format!("| {} | {}{} | {} | {}min | {}{} |", i + 1, t.title, blocked_tag, type_label, t.estimated_minutes, status_label, progress_tag));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let done_section = find_section(&tpl.sections, "done");
    lines.push(done_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &done_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    let all_done: Vec<&Task> = report.completed_main.iter().chain(report.completed_side.iter()).collect();
    if all_done.is_empty() {
        if let Some(empty) = &done_section.empty_row { lines.push(render_empty_row(empty)); }
    } else {
        for (i, t) in all_done.iter().enumerate() {
            let type_label = if t.task_type == "main" { "主线" } else { "支线" };
            lines.push(format!("| {} | {} | {} | {}min | - |", i + 1, t.title, type_label, t.estimated_minutes));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let waiting_section = find_section(&tpl.sections, "waiting");
    lines.push(waiting_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &waiting_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    if report.blockers.is_empty() {
        if let Some(empty) = &waiting_section.empty_row { lines.push(render_empty_row(empty)); }
    } else {
        for (i, b) in report.blockers.iter().enumerate() {
            let parts: Vec<&str> = b.splitn(2, '：').collect();
            if parts.len() == 2 {
                lines.push(format!("| {} | {} | {} | - | - |", i + 1, parts[0], parts[1]));
            } else {
                lines.push(format!("| {} | {} | - | - | - |", i + 1, b));
            }
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let pdca_section = find_section(&tpl.sections, "pdca");
    lines.push(pdca_section.heading.clone());
    lines.push(String::new());
    if let Some(fields) = &pdca_section.fields {
        let plan_rate = report.plan_completion_rate.map_or("_".to_string(), |r| r.to_string());
        let actual_rate = report.actual_completion_rate.map_or("_".to_string(), |r| r.to_string());
        if let Some(v) = fields.get("planCompletionRate") {
            lines.push(v.as_str().unwrap_or_default()
                .replace("{{plan}}", &plan_rate)
                .replace("{{actual}}", &actual_rate));
        }
        lines.push(String::new());
        if let Some(v) = fields.get("deviationAnalysis") {
            lines.push(v.as_str().unwrap_or_default().to_string());
        }
        let deviation = if report.deviation_analysis.is_empty() { "待补充".to_string() } else { report.deviation_analysis.clone() };
        lines.push(format!("- {}", deviation));
        lines.push(String::new());
        if let Some(v) = fields.get("improvementMeasures") {
            lines.push(v.as_str().unwrap_or_default().to_string());
        }
        let improvement = if report.improvement_measures.is_empty() { "待补充".to_string() } else { report.improvement_measures.clone() };
        lines.push(format!("- {}", improvement));
        lines.push(String::new());
        if let Some(v) = fields.get("focusScore") {
            let focus = report.focus_score.map_or("_".to_string(), |s| s.to_string());
            lines.push(v.as_str().unwrap_or_default().replace("{{score}}", &focus));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let plan_section = find_section(&tpl.sections, "tomorrowPlan");
    lines.push(plan_section.heading.clone());
    if report.tomorrow_plan.is_empty() {
        lines.push(format!("- {}", plan_section.empty_item.as_deref().unwrap_or("待规划")));
    } else {
        for p in &report.tomorrow_plan {
            lines.push(format!("- {}", p));
        }
    }
    lines.push(String::new());
    if !report.llm_content.is_empty() {
        let llm_section = find_section(&tpl.sections, "llmContent");
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push(llm_section.heading.clone());
        lines.push(report.llm_content.clone());
        lines.push(String::new());
    }
    lines.join("\n")
}

// ========== Weekly Report Markdown ==========

fn generate_weekly_markdown(report: &WeeklyReport) -> String {
    let tpl = load_template("weekly-report");
    let mut lines = vec![];
    lines.push(tpl.title.replace("{{weekStart}}", &report.week_start).replace("{{weekEnd}}", &report.week_end));
    lines.push(String::new());
    lines.push(tpl.subtitle.replace("{{weekStart}}", &report.week_start).replace("{{weekEnd}}", &report.week_end));
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let overview_section = find_section(&tpl.sections, "overview");
    lines.push(overview_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &overview_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    let main_completed = report.highlights.len();
    let total_issues = report.issues.len();
    let daily_count = report.daily_reports.len();
    if let Some(rows) = &overview_section.static_rows {
        for row in rows {
            lines.push(format!("| {} |", row.iter().map(|c| c.replace("{{mainCompleted}}", &main_completed.to_string())).collect::<Vec<_>>().join(" | ")));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let star_section = find_section(&tpl.sections, "starAchievements");
    if !report.star_achievements.is_empty() {
        lines.push(star_section.heading.clone());
        lines.push(String::new());
        if let Some(subs) = &star_section.sub_sections {
            let iter_sub = subs.iter().find(|s| s.id == "iteration").unwrap();
            lines.push(iter_sub.heading.clone());
            lines.push(String::new());
            for (i, s) in report.star_achievements.iter().enumerate() {
                lines.push(format!("**成果{}**：{}", i + 1, s.title));
                lines.push(format!("- **S (背景)**：{}", if s.situation.is_empty() { "待补充" } else { &s.situation }));
                lines.push(format!("- **T (目标)**：{}", if s.task.is_empty() { "待补充" } else { &s.task }));
                lines.push(format!("- **A (行动)**：{}", if s.action.is_empty() { "待补充" } else { &s.action }));
                lines.push(format!("- **R (结果)**：{}", if s.result.is_empty() { "待补充" } else { &s.result }));
                lines.push(String::new());
            }
            let other_sub = subs.iter().find(|s| s.id == "other").unwrap();
            lines.push(other_sub.heading.clone());
            lines.push(String::new());
            lines.push(other_sub.placeholder.as_deref().unwrap_or("（待补充）").to_string());
            lines.push(String::new());
        }
    }
    lines.push("---".to_string());
    lines.push(String::new());

    let blockers_section = find_section(&tpl.sections, "blockers");
    lines.push(blockers_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &blockers_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    if report.issues.is_empty() {
        if let Some(empty) = &blockers_section.empty_row { lines.push(render_empty_row(empty)); }
    } else {
        for issue in &report.issues {
            let parts: Vec<&str> = issue.splitn(2, '：').collect();
            let title = parts.first().unwrap_or(&"-");
            lines.push(format!("| {} | - | 未解决 | 待跟进 |", title));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let pdca_section = find_section(&tpl.sections, "pdca");
    lines.push(pdca_section.heading.clone());
    lines.push(String::new());
    if let Some(subs) = &pdca_section.sub_sections {
        let check_sub = subs.iter().find(|s| s.id == "check").unwrap();
        lines.push(check_sub.heading.clone());
        lines.push(String::new());
        if let Some(cols) = &check_sub.columns {
            for h in render_table_header(cols) { lines.push(h); }
        }
        let deviation = if report.deviation_analysis.is_empty() { "待补充".to_string() } else { report.deviation_analysis.clone() };
        if let Some(rows) = &check_sub.rows {
            for row in rows {
                lines.push(format!("| {} |", row.iter().map(|c|
                    c.replace("{{mainCompleted}}", &main_completed.to_string())
                     .replace("{{dailyCount}}", &daily_count.to_string())
                     .replace("{{deviationAnalysis}}", &deviation)
                     .replace("{{avgFocusScore}}", report.avg_focus_score.as_deref().unwrap_or("-"))
                     .replace("{{resolvedIssues}}", if total_issues > 0 { "0" } else { "-" })
                     .replace("{{totalIssues}}", &total_issues.to_string())
                ).collect::<Vec<_>>().join(" | ")));
            }
        }
        lines.push(String::new());
        let act_sub = subs.iter().find(|s| s.id == "act").unwrap();
        lines.push(act_sub.heading.clone());
        lines.push(String::new());
        if report.improvement_measures.is_empty() {
            lines.push(format!("- {}", act_sub.empty_item.as_deref().unwrap_or("待补充")));
        } else {
            lines.push(format!("- {}", report.improvement_measures));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let plan_section = find_section(&tpl.sections, "nextWeekPlan");
    lines.push(plan_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &plan_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    if report.next_week_plan.is_empty() {
        if let Some(empty) = &plan_section.empty_row { lines.push(render_empty_row(empty)); }
    } else {
        for (i, p) in report.next_week_plan.iter().enumerate() {
            lines.push(format!("| {} | {} | - | - |", i + 1, p));
        }
    }
    lines.push(String::new());
    if !report.llm_content.is_empty() {
        let llm_section = find_section(&tpl.sections, "llmContent");
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push(llm_section.heading.clone());
        lines.push(report.llm_content.clone());
        lines.push(String::new());
    }
    lines.join("\n")
}

// ========== Monthly Report Markdown ==========

fn generate_monthly_markdown(report: &MonthlyReport) -> String {
    let tpl = load_template("monthly-report");
    let mut lines = vec![];
    lines.push(tpl.title.replace("{{month}}", &report.month));
    lines.push(String::new());
    lines.push(tpl.subtitle.replace("{{month}}", &report.month));
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let overview_section = find_section(&tpl.sections, "overview");
    lines.push(overview_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &overview_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    let highlight_count = report.highlights.len();
    if let Some(rows) = &overview_section.static_rows {
        for row in rows {
            lines.push(format!("| {} |", row.iter().map(|c| c.replace("{{highlightCount}}", &highlight_count.to_string())).collect::<Vec<_>>().join(" | ")));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let iter_section = find_section(&tpl.sections, "iterationWork");
    if !report.star_achievements.is_empty() {
        lines.push(iter_section.heading.clone());
        lines.push(String::new());
        for s in &report.star_achievements {
            lines.push(format!("### {}", if s.title.is_empty() { "迭代版本" } else { &s.title }));
            lines.push(format!("**S (背景)**：{}", if s.situation.is_empty() { "待补充" } else { &s.situation }));
            lines.push(format!("**T (目标)**：{}", if s.task.is_empty() { "待补充" } else { &s.task }));
            lines.push(format!("**A (行动)**：{}", if s.action.is_empty() { "待补充" } else { &s.action }));
            lines.push(format!("**R (结果)**：{}", if s.result.is_empty() { "待补充" } else { &s.result }));
            lines.push(String::new());
        }
    }
    let other_section = find_section(&tpl.sections, "otherWork");
    lines.push(other_section.heading.clone());
    lines.push(String::new());
    lines.push(format!("### {}", other_section.default_title.as_deref().unwrap_or("专项工作")));
    lines.push("**S**：".to_string());
    lines.push("**T**：".to_string());
    lines.push("**A**：".to_string());
    lines.push("**R**：".to_string());
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let stats_section = find_section(&tpl.sections, "statistics");
    lines.push(stats_section.heading.clone());
    lines.push(String::new());
    if let Some(cols) = &stats_section.columns {
        for h in render_table_header(cols) { lines.push(h); }
    }
    if let Some(rows) = &stats_section.static_rows {
        for row in rows {
            lines.push(format!("| {} |", row.join(" | ")));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let pdca_section = find_section(&tpl.sections, "pdca");
    lines.push(pdca_section.heading.clone());
    lines.push(String::new());
    if let Some(subs) = &pdca_section.sub_sections {
        let check_sub = subs.iter().find(|s| s.id == "check").unwrap();
        lines.push(check_sub.heading.clone());
        lines.push(String::new());
        if let Some(items) = &check_sub.items {
            for item in items {
                lines.push(format!("- **{}**：", item.label));
                if item.label == "亮点" {
                    if report.highlights.is_empty() {
                        lines.push(format!("  - {}", item.empty_item));
                    } else {
                        for h in &report.highlights {
                            lines.push(format!("  - {}", h));
                        }
                    }
                } else {
                    lines.push(format!("  - {}", item.empty_item));
                }
            }
        }
        lines.push(String::new());
        let act_sub = subs.iter().find(|s| s.id == "act").unwrap();
        lines.push(act_sub.heading.clone());
        lines.push(String::new());
        if report.improvement_measures.is_empty() {
            lines.push(format!("- {}", act_sub.empty_item.as_deref().unwrap_or("待补充")));
        } else {
            lines.push(format!("- {}", report.improvement_measures));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());

    let plan_section = find_section(&tpl.sections, "nextMonthPlan");
    lines.push(plan_section.heading.clone());
    if report.next_month_plan.is_empty() {
        lines.push(format!("- {}", plan_section.empty_item.as_deref().unwrap_or("待规划")));
    } else {
        for p in &report.next_month_plan {
            lines.push(format!("- {}", p));
        }
    }
    lines.push(String::new());
    if !report.llm_content.is_empty() {
        let llm_section = find_section(&tpl.sections, "llmContent");
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push(llm_section.heading.clone());
        lines.push(report.llm_content.clone());
        lines.push(String::new());
    }
    lines.join("\n")
}

// ========== Morning Plan Commands ==========

#[tauri::command]
pub fn list_morning_plans(state: State<AppData>) -> Vec<MorningPlan> {
    let dir = reports_dir(&state).join("morning-plan");
    ensure_dir(&dir);
    let Ok(entries) = fs::read_dir(&dir) else { return vec![]; };
    let mut plans: Vec<MorningPlan> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "json").unwrap_or(false))
        .filter_map(|e| read_json_file::<MorningPlan>(&e.path()))
        .collect();
    plans.sort_by(|a, b| b.date.cmp(&a.date));
    plans.dedup_by(|a, b| a.date == b.date);
    plans
}

#[tauri::command]
pub fn get_morning_plan(state: State<AppData>, date: String) -> Result<MorningPlan, String> {
    let path = reports_dir(&state).join("morning-plan").join(format!("{}.json", date));
    read_json_file::<MorningPlan>(&path).ok_or_else(|| "Morning plan not found".to_string())
}

#[tauri::command]
pub fn generate_morning_plan(state: State<AppData>, input: MorningPlanInput) -> Result<MorningPlan, String> {
    let date = input.date.unwrap_or_else(|| today());
    let tasks = tasks::read_tasks_from_state(&state);
    let now = now_iso();
    let yesterday_date = yesterday(&date);

    let mut yesterday_report: Option<DailyReport> = None;
    let yesterday_file = reports_dir(&state).join("daily").join(format!("{}.json", yesterday_date));
    if yesterday_file.exists() {
        yesterday_report = read_json_file::<DailyReport>(&yesterday_file);
    }

    let in_progress: Vec<&Task> = tasks.iter().filter(|t| t.status == "in_progress").collect();
    let todo: Vec<&Task> = tasks.iter().filter(|t| t.status == "todo").collect();
    let blocked: Vec<&Task> = tasks.iter().filter(|t| t.blocked).collect();

    let yesterday_completed = if let Some(ref yr) = yesterday_report {
        let mut titles = vec![];
        for t in &yr.completed_main { titles.push(t.title.clone()); }
        for t in &yr.completed_side { titles.push(t.title.clone()); }
        titles
    } else {
        vec![]
    };

    let yesterday_unfinished = if let Some(ref yr) = yesterday_report {
        yr.in_progress.iter().map(|t| UnfinishedTask {
            title: t.title.clone(),
            task_type: t.task_type.clone(),
            progress: t.progress,
        }).collect()
    } else {
        vec![]
    };

    let yesterday_blockers = if let Some(ref yr) = yesterday_report {
        yr.blockers.clone()
    } else {
        vec![]
    };

    let yesterday_tomorrow_plan = if let Some(ref yr) = yesterday_report {
        yr.tomorrow_plan.clone()
    } else {
        vec![]
    };

    let mut next_actions: Vec<NextAction> = in_progress.iter().chain(todo.iter()).take(8).map(|t| NextAction {
        title: t.title.clone(),
        task_type: t.task_type.clone(),
        priority: t.priority.clone(),
        estimated_minutes: t.estimated_minutes,
        status: t.status.clone(),
        progress: t.progress,
        blocked: t.blocked,
        blocked_reason: t.blocked_reason.clone(),
    }).collect();

    if let Some(user_actions) = input.next_actions {
        next_actions = user_actions.iter().filter_map(|v| {
            let title = v.get("title")?.as_str()?.to_string();
            Some(NextAction {
                title,
                task_type: v.get("type").and_then(|v| v.as_str()).unwrap_or("main").to_string(),
                priority: v.get("priority").and_then(|v| v.as_str()).unwrap_or("P2").to_string(),
                estimated_minutes: v.get("estimatedMinutes").and_then(|v| v.as_i64()).unwrap_or(30) as i32,
                status: v.get("status").and_then(|v| v.as_str()).unwrap_or("todo").to_string(),
                progress: v.get("progress").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                blocked: v.get("blocked").and_then(|v| v.as_bool()).unwrap_or(false),
                blocked_reason: v.get("blockedReason").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            })
        }).collect();
    }

    let waiting: Vec<WaitingItem> = blocked.iter().map(|t| WaitingItem {
        title: t.title.clone(),
        reason: t.blocked_reason.clone(),
    }).collect();

    let plan = MorningPlan {
        date: date.clone(),
        yesterday_completed,
        yesterday_unfinished,
        yesterday_blockers,
        yesterday_tomorrow_plan,
        inbox: input.inbox.unwrap_or_default(),
        next_actions,
        waiting,
        notes: input.notes.unwrap_or_default(),
        llm_content: input.llm_content.unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };

    let dir = reports_dir(&state).join("morning-plan");
    ensure_dir(&dir);
    write_json_file(&dir.join(format!("{}.json", plan.date)), &plan);

    let md = generate_morning_plan_markdown(&plan);
    let md_path = get_md_dir(&state, "daily", &plan.date);
    fs::write(md_path.join(format!("{}-plan.md", plan.date)), md).unwrap();

    Ok(plan)
}

#[tauri::command]
pub fn update_morning_plan(state: State<AppData>, date: String, data: MorningPlanInput) -> Result<MorningPlan, String> {
    let path = reports_dir(&state).join("morning-plan").join(format!("{}.json", date));
    let mut existing: MorningPlan = read_json_file::<MorningPlan>(&path).ok_or("Morning plan not found")?;
    let now = now_iso();
    if let Some(inbox) = data.inbox { existing.inbox = inbox; }
    if let Some(notes) = data.notes { existing.notes = notes; }
    if let Some(llm_content) = data.llm_content { existing.llm_content = llm_content; }
    if let Some(next_actions) = data.next_actions {
        existing.next_actions = next_actions.iter().filter_map(|v| {
            let title = v.get("title")?.as_str()?.to_string();
            Some(NextAction {
                title,
                task_type: v.get("type").and_then(|v| v.as_str()).unwrap_or("main").to_string(),
                priority: v.get("priority").and_then(|v| v.as_str()).unwrap_or("P2").to_string(),
                estimated_minutes: v.get("estimatedMinutes").and_then(|v| v.as_i64()).unwrap_or(30) as i32,
                status: v.get("status").and_then(|v| v.as_str()).unwrap_or("todo").to_string(),
                progress: v.get("progress").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                blocked: v.get("blocked").and_then(|v| v.as_bool()).unwrap_or(false),
                blocked_reason: v.get("blockedReason").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            })
        }).collect();
    }
    existing.updated_at = now;
    write_json_file(&path, &existing);

    let md = generate_morning_plan_markdown(&existing);
    let md_path = get_md_dir(&state, "daily", &date);
    fs::write(md_path.join(format!("{}-plan.md", date)), md).unwrap();

    Ok(existing)
}

// ========== Daily Report Commands ==========

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
    reports.dedup_by(|a, b| a.date == b.date);
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

    let morning_plan_path = reports_dir(&state).join("morning-plan").join(format!("{}.json", date));
    let morning_plan = read_json_file::<MorningPlan>(&morning_plan_path);

    let report = DailyReport {
        date: date.clone(),
        inbox: Vec::new(),
        completed_main,
        completed_side,
        in_progress,
        todo,
        tomorrow_plan: input.tomorrow_plan.unwrap_or_default(),
        blockers,
        notes: input.notes.unwrap_or_default(),
        focus_score: input.focus_score,
        plan_completion_rate: input.plan_completion_rate,
        actual_completion_rate: input.actual_completion_rate,
        deviation_analysis: input.deviation_analysis.unwrap_or_default(),
        improvement_measures: input.improvement_measures.unwrap_or_default(),
        morning_plan,
        llm_content: input.llm_content.unwrap_or_default(),
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
    if let Some(focus_score) = data.focus_score { existing.focus_score = Some(focus_score); }
    if let Some(plan_completion_rate) = data.plan_completion_rate { existing.plan_completion_rate = Some(plan_completion_rate); }
    if let Some(actual_completion_rate) = data.actual_completion_rate { existing.actual_completion_rate = Some(actual_completion_rate); }
    if let Some(deviation_analysis) = data.deviation_analysis { existing.deviation_analysis = deviation_analysis; }
    if let Some(improvement_measures) = data.improvement_measures { existing.improvement_measures = improvement_measures; }
    if let Some(llm_content) = data.llm_content { existing.llm_content = llm_content; }
    existing.updated_at = now;
    write_json_file(&path, &existing);

    let md = generate_daily_markdown(&existing);
    let md_path = get_md_dir(&state, "daily", &date);
    fs::write(md_path.join(format!("{}.md", date)), md).unwrap();

    Ok(existing)
}

#[tauri::command]
pub fn delete_daily_report(state: State<AppData>, date: String) -> Result<serde_json::Value, String> {
    let path = reports_dir(&state).join("daily").join(format!("{}.json", date));
    if !path.exists() { return Err("Report not found".to_string()); }
    fs::remove_file(path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

// ========== Weekly Report Commands ==========

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
    reports.dedup_by(|a, b| a.week_start == b.week_start);
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

    let avg_focus_score = {
        let scores: Vec<i32> = daily_reports.iter().filter_map(|r| r.focus_score).collect();
        if scores.is_empty() { None } else { Some(format!("{:.1}", scores.iter().sum::<i32>() as f64 / scores.len() as f64)) }
    };

    let star_achievements: Vec<StarAchievement> = input.star_achievements.unwrap_or_default().iter().filter_map(|v| {
        Some(StarAchievement {
            title: v.get("title")?.as_str()?.to_string(),
            situation: v.get("situation").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            task: v.get("task").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            action: v.get("action").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            result: v.get("result").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }).collect();

    let report = WeeklyReport {
        week_start: input.week_start.clone(),
        week_end: input.week_end,
        daily_reports,
        summary: input.summary.unwrap_or_default(),
        highlights,
        issues,
        next_week_plan: input.next_week_plan.unwrap_or_default(),
        avg_focus_score,
        deviation_analysis: input.deviation_analysis.unwrap_or_default(),
        improvement_measures: input.improvement_measures.unwrap_or_default(),
        star_achievements,
        llm_content: input.llm_content.unwrap_or_default(),
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
pub fn delete_weekly_report(state: State<AppData>, week_start: String) -> Result<serde_json::Value, String> {
    let path = reports_dir(&state).join("weekly").join(format!("{}.json", week_start));
    if !path.exists() { return Err("Report not found".to_string()); }
    fs::remove_file(path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

// ========== Monthly Report Commands ==========

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
    reports.dedup_by(|a, b| a.month == b.month);
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

    let star_achievements: Vec<StarAchievement> = input.star_achievements.unwrap_or_default().iter().filter_map(|v| {
        Some(StarAchievement {
            title: v.get("title")?.as_str()?.to_string(),
            situation: v.get("situation").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            task: v.get("task").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            action: v.get("action").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            result: v.get("result").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }).collect();

    let report = MonthlyReport {
        month: input.month.clone(),
        weekly_reports,
        summary: input.summary.unwrap_or_default(),
        highlights,
        issues,
        next_month_plan: input.next_month_plan.unwrap_or_default(),
        star_achievements,
        deviation_analysis: input.deviation_analysis.unwrap_or_default(),
        improvement_measures: input.improvement_measures.unwrap_or_default(),
        llm_content: input.llm_content.unwrap_or_default(),
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

#[tauri::command]
pub fn delete_monthly_report(state: State<AppData>, month: String) -> Result<serde_json::Value, String> {
    let path = reports_dir(&state).join("monthly").join(format!("{}.json", month));
    if !path.exists() { return Err("Report not found".to_string()); }
    fs::remove_file(path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}
