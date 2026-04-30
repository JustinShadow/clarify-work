use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    #[serde(rename = "type")]
    pub task_type: String,
    pub priority: String,
    pub status: String,
    pub progress: i32,
    pub blocked: bool,
    pub blocked_reason: String,
    pub estimated_minutes: i32,
    pub deadline: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub task_type: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub progress: Option<i32>,
    pub blocked: Option<bool>,
    pub blocked_reason: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub deadline: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StarAchievement {
    pub title: String,
    pub situation: String,
    pub task: String,
    pub action: String,
    pub result: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MorningPlan {
    pub date: String,
    pub yesterday_completed: Vec<String>,
    pub yesterday_unfinished: Vec<UnfinishedTask>,
    pub yesterday_blockers: Vec<String>,
    pub yesterday_tomorrow_plan: Vec<String>,
    pub inbox: Vec<String>,
    pub next_actions: Vec<NextAction>,
    pub waiting: Vec<WaitingItem>,
    pub notes: String,
    pub llm_content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnfinishedTask {
    pub title: String,
    #[serde(rename = "type")]
    pub task_type: String,
    pub progress: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NextAction {
    pub title: String,
    #[serde(rename = "type")]
    pub task_type: String,
    pub priority: String,
    pub estimated_minutes: i32,
    pub status: String,
    pub progress: i32,
    pub blocked: bool,
    pub blocked_reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WaitingItem {
    pub title: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MorningPlanInput {
    pub date: Option<String>,
    pub inbox: Option<Vec<String>>,
    pub next_actions: Option<Vec<serde_json::Value>>,
    pub notes: Option<String>,
    pub llm_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyReport {
    pub date: String,
    pub inbox: Vec<String>,
    pub completed_main: Vec<Task>,
    pub completed_side: Vec<Task>,
    pub in_progress: Vec<Task>,
    pub todo: Vec<Task>,
    pub tomorrow_plan: Vec<String>,
    pub blockers: Vec<String>,
    pub notes: String,
    pub focus_score: Option<i32>,
    pub plan_completion_rate: Option<i32>,
    pub actual_completion_rate: Option<i32>,
    pub deviation_analysis: String,
    pub improvement_measures: String,
    pub morning_plan: Option<MorningPlan>,
    pub llm_content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeeklyReport {
    pub week_start: String,
    pub week_end: String,
    pub daily_reports: Vec<DailyReport>,
    pub summary: String,
    pub highlights: Vec<String>,
    pub issues: Vec<String>,
    pub next_week_plan: Vec<String>,
    pub avg_focus_score: Option<String>,
    pub deviation_analysis: String,
    pub improvement_measures: String,
    pub star_achievements: Vec<StarAchievement>,
    pub llm_content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyReport {
    pub month: String,
    pub weekly_reports: Vec<WeeklyReport>,
    pub summary: String,
    pub highlights: Vec<String>,
    pub issues: Vec<String>,
    pub next_month_plan: Vec<String>,
    pub star_achievements: Vec<StarAchievement>,
    pub deviation_analysis: String,
    pub improvement_measures: String,
    pub llm_content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub total: usize,
    pub todo: usize,
    pub in_progress: usize,
    pub blocked: usize,
    pub done: usize,
    pub total_estimated_minutes: i32,
    pub completed_today: usize,
    pub overdue_count: usize,
    pub overdue_tasks: Vec<Task>,
    pub main_count: usize,
    pub side_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyReportInput {
    pub date: Option<String>,
    pub tomorrow_plan: Option<Vec<String>>,
    pub blockers: Option<Vec<String>>,
    pub notes: Option<String>,
    pub focus_score: Option<i32>,
    pub plan_completion_rate: Option<i32>,
    pub actual_completion_rate: Option<i32>,
    pub deviation_analysis: Option<String>,
    pub improvement_measures: Option<String>,
    pub llm_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeeklyReportInput {
    pub week_start: String,
    pub week_end: String,
    pub summary: Option<String>,
    pub next_week_plan: Option<Vec<String>>,
    pub star_achievements: Option<Vec<serde_json::Value>>,
    pub deviation_analysis: Option<String>,
    pub improvement_measures: Option<String>,
    pub llm_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyReportInput {
    pub month: String,
    pub summary: Option<String>,
    pub next_month_plan: Option<Vec<String>>,
    pub star_achievements: Option<Vec<serde_json::Value>>,
    pub deviation_analysis: Option<String>,
    pub improvement_measures: Option<String>,
    pub llm_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMConfig {
    pub provider: String,
    pub api_key: String,
    pub base_url: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMConfigInput {
    pub provider: Option<String>,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEvent {
    pub content: Option<String>,
    pub done: Option<bool>,
    pub error: Option<String>,
}
