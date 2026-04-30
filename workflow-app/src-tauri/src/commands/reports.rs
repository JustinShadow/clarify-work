use std::fs;
use std::path::PathBuf;
use tauri::State;
use crate::models::*;
use crate::AppData;
use crate::commands::tasks;

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
    let mut lines = vec![];
    lines.push(format!("# 🌅 晨间工作规划 - {}", plan.date));
    lines.push(String::new());
    lines.push("> 基于昨日日报自动生成 + 今日新增输入 | GTD 任务流管理".to_string());
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 📌 昨日遗留（自动从昨日日报提取）".to_string());
    lines.push(String::new());
    lines.push("### ✅ 昨日完成事项回顾".to_string());
    lines.push(String::new());
    lines.push("| # | 任务描述 | 所属项目 | 成果简述 |".to_string());
    lines.push("|---|---------|----------|---------|".to_string());
    if plan.yesterday_completed.is_empty() {
        lines.push("| - | 无 | - | - |".to_string());
    } else {
        for (i, t) in plan.yesterday_completed.iter().enumerate() {
            lines.push(format!("| {} | {} | - | - |", i + 1, t));
        }
    }
    lines.push(String::new());
    lines.push("### ⏳ 昨日未完成 → 今日待续".to_string());
    lines.push(String::new());
    lines.push("| # | 任务描述 | 所属项目 | 昨日进度 | 今日目标 |".to_string());
    lines.push("|---|---------|----------|---------|---------|".to_string());
    if plan.yesterday_unfinished.is_empty() {
        lines.push("| - | 无 | - | - | - |".to_string());
    } else {
        for (i, t) in plan.yesterday_unfinished.iter().enumerate() {
            let type_label = if t.task_type == "main" { "主线" } else { "支线" };
            lines.push(format!("| {} | {} | {} | {}% | 推进完成 |", i + 1, t.title, type_label, t.progress));
        }
    }
    lines.push(String::new());
    lines.push("### 🔄 昨日阻塞事项 → 今日跟进".to_string());
    lines.push(String::new());
    lines.push("| # | 阻塞事项 | 阻塞原因 | 今日是否可推进 |".to_string());
    lines.push("|---|---------|---------|---------------|".to_string());
    if plan.yesterday_blockers.is_empty() {
        lines.push("| - | 无 | - | - |".to_string());
    } else {
        for (i, b) in plan.yesterday_blockers.iter().enumerate() {
            lines.push(format!("| {} | {} | - | 待确认 |", i + 1, b));
        }
    }
    lines.push(String::new());
    lines.push("### 💡 昨日报明日计划 → 今日继承".to_string());
    lines.push(String::new());
    lines.push("| # | 计划事项 | 优先级 |".to_string());
    lines.push("|---|---------|--------|".to_string());
    if plan.yesterday_tomorrow_plan.is_empty() {
        lines.push("| - | 无 | - |".to_string());
    } else {
        for (i, p) in plan.yesterday_tomorrow_plan.iter().enumerate() {
            lines.push(format!("| {} | {} | - |", i + 1, p));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 📥 今日新增任务（用户输入）".to_string());
    lines.push(String::new());
    lines.push("| # | 任务描述 | 来源 | 优先级 | 预计耗时 |".to_string());
    lines.push("|---|---------|------|--------|---------|".to_string());
    if plan.inbox.is_empty() {
        lines.push("| - | 无 | - | - | - |".to_string());
    } else {
        for (i, t) in plan.inbox.iter().enumerate() {
            lines.push(format!("| {} | {} | - | - | - |", i + 1, t));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 🎯 今日工作安排（按优先级排序）".to_string());
    lines.push(String::new());
    lines.push("| # | 任务 | 优先级 | 类型(续/新) | 预计耗时 | 时间段 |".to_string());
    lines.push("|---|------|--------|------------|---------|--------|".to_string());
    for (i, t) in plan.next_actions.iter().enumerate() {
        let blocked_tag = if t.blocked { " ⛔" } else { "" };
        let type_label = if t.task_type == "main" { "主线" } else { "支线" };
        let is_continue = plan.yesterday_unfinished.iter().any(|y| y.title == t.title);
        let cont_label = if is_continue { "续" } else { "新" };
        lines.push(format!("| {} | {}{} | {} | {}({}) | {}min | - |", i + 1, t.title, blocked_tag, t.priority, type_label, cont_label, t.estimated_minutes));
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 📝 今日注意事项".to_string());
    lines.push(String::new());
    if plan.notes.is_empty() {
        lines.push("- 无".to_string());
    } else {
        lines.push(plan.notes.clone());
    }
    lines.push(String::new());
    lines.join("\n")
}

// ========== Daily Report Markdown ==========

fn generate_daily_markdown(report: &DailyReport) -> String {
    let mut lines = vec![];
    lines.push(format!("# 📋 日报 - {}", report.date));
    lines.push(String::new());
    lines.push("> 工作管理框架：GTD（任务流） | STAR（成果记录） | PDCA（复盘改进）".to_string());
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 📥 Inbox - 今日新增任务".to_string());
    lines.push(String::new());
    lines.push("| # | 任务描述 | 来源 | 优先级 |".to_string());
    lines.push("|---|---------|------|--------|".to_string());
    if report.inbox.is_empty() {
        lines.push("| - | 无 | - | - |".to_string());
    } else {
        for (i, t) in report.inbox.iter().enumerate() {
            lines.push(format!("| {} | {} | - | - |", i + 1, t));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 🎯 Next Actions - 今日执行".to_string());
    lines.push(String::new());
    lines.push("| # | 任务描述 | 所属项目 | 预计耗时 | 状态 |".to_string());
    lines.push("|---|---------|----------|---------|------|".to_string());
    let all_active: Vec<&Task> = report.in_progress.iter().chain(report.todo.iter()).collect();
    if all_active.is_empty() {
        lines.push("| - | 无 | - | - | - |".to_string());
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
    lines.push("## ✅ Done - 今日完成".to_string());
    lines.push(String::new());
    lines.push("| # | 任务描述 | 所属项目 | 实际耗时 | 成果简述 |".to_string());
    lines.push("|---|---------|----------|---------|---------|".to_string());
    let all_done: Vec<&Task> = report.completed_main.iter().chain(report.completed_side.iter()).collect();
    if all_done.is_empty() {
        lines.push("| - | 无 | - | - | - |".to_string());
    } else {
        for (i, t) in all_done.iter().enumerate() {
            let type_label = if t.task_type == "main" { "主线" } else { "支线" };
            lines.push(format!("| {} | {} | {} | {}min | - |", i + 1, t.title, type_label, t.estimated_minutes));
        }
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## ⏳ Waiting - 阻塞/依赖".to_string());
    lines.push(String::new());
    lines.push("| # | 阻塞事项 | 原因 | 需要谁协助 | 预计解决时间 |".to_string());
    lines.push("|---|---------|------|-----------|-------------|".to_string());
    if report.blockers.is_empty() {
        lines.push("| - | 无 | - | - | - |".to_string());
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
    lines.push("## 🔍 今日复盘 (PDCA-Check)".to_string());
    lines.push(String::new());
    let plan_rate = report.plan_completion_rate.map_or("_".to_string(), |r| r.to_string());
    let actual_rate = report.actual_completion_rate.map_or("_".to_string(), |r| r.to_string());
    lines.push(format!("**计划完成率**：{}/5 → 实际完成率：{}/5", plan_rate, actual_rate));
    lines.push(String::new());
    lines.push("**偏差分析**：".to_string());
    let deviation = if report.deviation_analysis.is_empty() { "待补充".to_string() } else { report.deviation_analysis.clone() };
    lines.push(format!("- {}", deviation));
    lines.push(String::new());
    lines.push("**改进措施 (PDCA-Act)**：".to_string());
    let improvement = if report.improvement_measures.is_empty() { "待补充".to_string() } else { report.improvement_measures.clone() };
    lines.push(format!("- {}", improvement));
    lines.push(String::new());
    let focus = report.focus_score.map_or("_".to_string(), |s| s.to_string());
    lines.push(format!("**专注度评分** (1-5)：{}", focus));
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
    lines.push(String::new());
    if !report.llm_content.is_empty() {
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push("## 🤖 AI 辅助内容".to_string());
        lines.push(report.llm_content.clone());
        lines.push(String::new());
    }
    lines.join("\n")
}

// ========== Weekly Report Markdown ==========

fn generate_weekly_markdown(report: &WeeklyReport) -> String {
    let mut lines = vec![];
    lines.push(format!("# 📊 周报 - {} ~ {}", report.week_start, report.week_end));
    lines.push(String::new());
    lines.push(format!("> 基于 {} ~ {} 的日报汇总", report.week_start, report.week_end));
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 📋 本周任务总览".to_string());
    lines.push(String::new());
    lines.push("| 类别 | 计划任务数 | 完成任务数 | 完成率 |".to_string());
    lines.push("|------|-----------|-----------|--------|".to_string());
    let main_completed = report.highlights.len();
    let total_issues = report.issues.len();
    let daily_count = report.daily_reports.len();
    lines.push(format!("| 测试任务（迭代） | - | {} | - |", main_completed));
    lines.push("| 其他任务（部署/开发等） | - | - | - |".to_string());
    lines.push(format!("| 合计 | - | {} | - |", main_completed));
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    if !report.star_achievements.is_empty() {
        lines.push("## ✅ 关键成果 (STAR格式)".to_string());
        lines.push(String::new());
        lines.push("### 测试迭代相关工作".to_string());
        lines.push(String::new());
        for (i, s) in report.star_achievements.iter().enumerate() {
            lines.push(format!("**成果{}**：{}", i + 1, s.title));
            lines.push(format!("- **S (背景)**：{}", if s.situation.is_empty() { "待补充" } else { &s.situation }));
            lines.push(format!("- **T (目标)**：{}", if s.task.is_empty() { "待补充" } else { &s.task }));
            lines.push(format!("- **A (行动)**：{}", if s.action.is_empty() { "待补充" } else { &s.action }));
            lines.push(format!("- **R (结果)**：{}", if s.result.is_empty() { "待补充" } else { &s.result }));
            lines.push(String::new());
        }
        lines.push("### 其他随机任务".to_string());
        lines.push(String::new());
        lines.push("（待补充）".to_string());
        lines.push(String::new());
    }
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## ⏳ 阻塞事项跟踪".to_string());
    lines.push(String::new());
    lines.push("| 阻塞事项 | 持续天数 | 当前状态 | 下周计划 |".to_string());
    lines.push("|---------|---------|---------|---------|".to_string());
    if report.issues.is_empty() {
        lines.push("| 无 | - | - | - |".to_string());
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
    lines.push("## 🔍 周度复盘 (PDCA)".to_string());
    lines.push(String::new());
    lines.push("### Check - 偏差分析".to_string());
    lines.push(String::new());
    lines.push("| 维度 | 计划 | 实际 | 偏差原因 |".to_string());
    lines.push("|------|------|------|---------|".to_string());
    let deviation = if report.deviation_analysis.is_empty() { "待补充".to_string() } else { report.deviation_analysis.clone() };
    lines.push(format!("| 任务完成率 | - | {}/{} | {} |", main_completed, daily_count, deviation));
    lines.push(format!("| 专注度均值 | - | {}/5 | - |", report.avg_focus_score.as_deref().unwrap_or("-")));
    lines.push(format!("| 阻塞解决率 | - | {}/{} | - |", if total_issues > 0 { "0" } else { "-" }, total_issues));
    lines.push(String::new());
    lines.push("### Act - 改进措施".to_string());
    lines.push(String::new());
    if report.improvement_measures.is_empty() {
        lines.push("- 待补充".to_string());
    } else {
        lines.push(format!("- {}", report.improvement_measures));
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 💡 下周计划".to_string());
    lines.push(String::new());
    lines.push("| # | 任务 | 优先级 | 预估耗时 |".to_string());
    lines.push("|---|------|--------|---------|".to_string());
    if report.next_week_plan.is_empty() {
        lines.push("| - | 待规划 | - | - |".to_string());
    } else {
        for (i, p) in report.next_week_plan.iter().enumerate() {
            lines.push(format!("| {} | {} | - | - |", i + 1, p));
        }
    }
    lines.push(String::new());
    if !report.llm_content.is_empty() {
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push("## 🤖 AI 辅助内容".to_string());
        lines.push(report.llm_content.clone());
        lines.push(String::new());
    }
    lines.join("\n")
}

// ========== Monthly Report Markdown ==========

fn generate_monthly_markdown(report: &MonthlyReport) -> String {
    let mut lines = vec![];
    lines.push(format!("# 📈 月报 - {}", report.month));
    lines.push(String::new());
    lines.push(format!("> 向上汇报 | {} 工作总结", report.month));
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 🎯 月度工作总览".to_string());
    lines.push(String::new());
    lines.push("| 类别 | 任务总数 | 完成数 | 完成率 |".to_string());
    lines.push("|------|---------|--------|--------|".to_string());
    let highlight_count = report.highlights.len();
    lines.push("| 测试迭代任务 | - | - | - |".to_string());
    lines.push("| 其他任务 | - | - | - |".to_string());
    lines.push(format!("| 合计 | - | {} | - |", highlight_count));
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    if !report.star_achievements.is_empty() {
        lines.push("## 📦 测试迭代工作 (STAR)".to_string());
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
    lines.push("## 🔧 其他专项工作 (STAR)".to_string());
    lines.push(String::new());
    lines.push("### 专项工作".to_string());
    lines.push("**S**：".to_string());
    lines.push("**T**：".to_string());
    lines.push("**A**：".to_string());
    lines.push("**R**：".to_string());
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 📊 月度数据统计".to_string());
    lines.push(String::new());
    lines.push("| 指标 | 本月 | 上月 | 变化趋势 |".to_string());
    lines.push("|------|------|------|---------|".to_string());
    lines.push("| 测试迭代参与数 | - | - | → |".to_string());
    lines.push("| Bug 发现总数 | - | - | → |".to_string());
    lines.push("| 严重 Bug 数 | - | - | → |".to_string());
    lines.push("| 随机任务数 | - | - | → |".to_string());
    lines.push("| 阻塞解决率 | - | - | → |".to_string());
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 🔍 月度复盘 (PDCA)".to_string());
    lines.push(String::new());
    lines.push("### Check".to_string());
    lines.push(String::new());
    lines.push("- **亮点**：".to_string());
    if report.highlights.is_empty() {
        lines.push("  - 待补充".to_string());
    } else {
        for h in &report.highlights {
            lines.push(format!("  - {}", h));
        }
    }
    lines.push("- **不足**：".to_string());
    lines.push("  - 待补充".to_string());
    lines.push("- **意外发现**：".to_string());
    lines.push("  - 待补充".to_string());
    lines.push(String::new());
    lines.push("### Act - 下月改进".to_string());
    lines.push(String::new());
    if report.improvement_measures.is_empty() {
        lines.push("- 待补充".to_string());
    } else {
        lines.push(format!("- {}", report.improvement_measures));
    }
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## 🚀 下月展望".to_string());
    if report.next_month_plan.is_empty() {
        lines.push("- 待规划".to_string());
    } else {
        for p in &report.next_month_plan {
            lines.push(format!("- {}", p));
        }
    }
    lines.push(String::new());
    if !report.llm_content.is_empty() {
        lines.push("---".to_string());
        lines.push(String::new());
        lines.push("## 🤖 AI 辅助内容".to_string());
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
