use std::fs;
use tauri::{State, ipc::Channel};
use crate::models::{LLMConfig, LLMConfigInput, StreamEvent};
use crate::AppData;

fn llm_config_path(state: &AppData) -> std::path::PathBuf {
    state.config_dir.join("llm-config.json")
}

fn read_llm_config(state: &AppData) -> LLMConfig {
    let path = llm_config_path(state);
    if !path.exists() {
        return LLMConfig {
            provider: "openai".to_string(),
            api_key: String::new(),
            base_url: "https://api.openai.com/v1".to_string(),
            model: "gpt-4o-mini".to_string(),
            temperature: 0.7,
            max_tokens: 8192,
        };
    }
    let content = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_else(|_| LLMConfig {
        provider: "openai".to_string(),
        api_key: String::new(),
        base_url: "https://api.openai.com/v1".to_string(),
        model: "gpt-4o-mini".to_string(),
        temperature: 0.7,
        max_tokens: 4096,
    })
}

fn write_llm_config(state: &AppData, config: &LLMConfig) {
    let path = llm_config_path(state);
    let content = serde_json::to_string_pretty(config).unwrap();
    fs::write(path, content).unwrap();
}

fn mask_api_key(key: &str) -> String {
    if key.is_empty() { return String::new(); }
    if key.len() <= 4 { return "••••".to_string(); }
    format!("••••••••{}", &key[key.len()-4..])
}

#[tauri::command]
pub fn get_llm_config(state: State<AppData>) -> LLMConfig {
    let config = read_llm_config(&state);
    LLMConfig {
        api_key: mask_api_key(&config.api_key),
        ..config
    }
}

#[tauri::command]
pub fn update_llm_config(state: State<AppData>, config: LLMConfigInput) -> LLMConfig {
    let mut existing = read_llm_config(&state);
    if let Some(provider) = config.provider { existing.provider = provider; }
    if let Some(api_key) = config.api_key.clone() {
        if !api_key.contains('•') { existing.api_key = api_key; }
    }
    if let Some(base_url) = config.base_url { existing.base_url = base_url; }
    if let Some(model) = config.model { existing.model = model; }
    if let Some(temperature) = config.temperature { existing.temperature = temperature; }
    if let Some(max_tokens) = config.max_tokens { existing.max_tokens = max_tokens; }
    write_llm_config(&state, &existing);
    LLMConfig {
        api_key: mask_api_key(&existing.api_key),
        ..existing
    }
}

#[tauri::command]
pub async fn test_llm(state: State<'_, AppData>) -> Result<serde_json::Value, String> {
    let config = read_llm_config(&state);
    if config.api_key.is_empty() {
        return Err("LLM API Key未配置，请在设置页面配置".to_string());
    }

    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "model": config.model,
        "messages": [{"role": "user", "content": include_str!("../../../../shared/prompts/test.txt")}],
        "temperature": config.temperature,
        "max_tokens": config.max_tokens,
    });

    let resp = client.post(&url)
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败：{}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("API返回错误 {}：{}", status, text));
    }

    let data: serde_json::Value = resp.json().await.map_err(|e| format!("解析响应失败：{}", e))?;
    let message = data["choices"][0]["message"]["content"].as_str().unwrap_or("连接成功").to_string();
    Ok(serde_json::json!({ "success": true, "message": message.trim() }))
}

#[tauri::command]
pub async fn llm_stream_generate(
    state: State<'_, AppData>,
    endpoint: String,
    body: serde_json::Value,
    on_event: Channel<StreamEvent>,
) -> Result<(), String> {
    let config = read_llm_config(&state);
    if config.api_key.is_empty() {
        let _ = on_event.send(StreamEvent {
            content: None,
            done: None,
            error: Some("LLM API Key未配置，请在设置页面配置".to_string()),
        });
        return Err("LLM API Key未配置，请在设置页面配置".to_string());
    }

    let endpoint: String = endpoint.trim_start_matches("/llm/").to_string();
    let system_prompt = match endpoint.as_str() {
        "generate-morning-plan" => get_morning_plan_prompt(),
        "generate-daily" => get_daily_report_prompt(),
        "generate-weekly" => get_weekly_report_prompt(),
        "generate-monthly" => get_monthly_report_prompt(),
        _ => {
            let _ = on_event.send(StreamEvent {
                content: None,
                done: None,
                error: Some(format!("Unknown endpoint: {}", endpoint)),
            });
            return Err(format!("Unknown endpoint: {}", endpoint));
        }
    };

    let context_data = build_context(&state, &endpoint, &body)?;

    let chat_history = body.get("chatHistory")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
    let mut messages = vec![
        serde_json::json!({"role": "system", "content": system_prompt}),
        serde_json::json!({"role": "user", "content": serde_json::to_string_pretty(&context_data).unwrap_or_default()}),
    ];
    messages.extend(chat_history);

    let request_body = serde_json::json!({
        "model": config.model,
        "messages": messages,
        "temperature": config.temperature,
        "max_tokens": config.max_tokens,
        "stream": true,
    });

    let resp = client.post(&url)
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            let err_msg = format!("请求失败：{}", e);
            let _ = on_event.send(StreamEvent {
                content: None,
                done: None,
                error: Some(err_msg.clone()),
            });
            err_msg
        })?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let err_msg = format!("API返回错误 {}：{}", status, text);
        let _ = on_event.send(StreamEvent {
            content: None,
            done: None,
            error: Some(err_msg.clone()),
        });
        return Err(err_msg);
    }

    let mut full_content = String::new();
    let mut stream = resp.bytes_stream();
    use futures_util::StreamExt;

    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                let err_msg = format!("读取流失败：{}", e);
                let _ = on_event.send(StreamEvent {
                    content: None,
                    done: None,
                    error: Some(err_msg.clone()),
                });
                return Err(err_msg);
            }
        };
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if !line.starts_with("data: ") { continue; }
            let data = &line[6..];
            if data == "[DONE]" { break; }

            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(delta) = parsed["choices"][0]["delta"]["content"].as_str() {
                    full_content.push_str(delta);
                    // Send event via channel in real-time
                    let _ = on_event.send(StreamEvent {
                        content: Some(full_content.clone()),
                        done: None,
                        error: None,
                    });
                }
            }
        }
    }

    // Send completion event
    let _ = on_event.send(StreamEvent {
        content: None,
        done: Some(true),
        error: None,
    });

    Ok(())
}

fn task_to_context(t: &crate::models::Task) -> serde_json::Value {
    let recent_events: Vec<serde_json::Value> = t.events.iter()
        .rev().take(3).rev()
        .map(|e| serde_json::json!({"date": e.date, "content": e.content}))
        .collect();
    let desc = t.description.chars().take(200).collect::<String>();
    let project = t.tags.first().cloned().unwrap_or_default();
    serde_json::json!({
        "title": t.title,
        "description": desc,
        "project": project,
        "priority": t.priority,
        "type": t.task_type,
        "progress": t.progress,
        "estimatedMinutes": t.estimated_minutes,
        "blocked": t.blocked,
        "blockedReason": t.blocked_reason,
        "deadline": t.deadline.as_deref().unwrap_or(""),
        "tags": t.tags,
        "result": t.result,
        "recentEvents": recent_events,
    })
}

fn build_context(state: &AppData, endpoint: &str, body: &serde_json::Value) -> Result<serde_json::Value, String> {
    use crate::commands::tasks;
    use crate::commands::reports::{reports_dir, today, yesterday, read_json_file};

    let tasks = tasks::read_tasks_from_state(state);
    let today_str = today();
    let date = body.get("date").and_then(|v| v.as_str()).unwrap_or(&today_str).to_string();

    match endpoint {
        "generate-morning-plan" => {
            let yesterday_date = yesterday(&date);
            let yesterday_file = reports_dir(state).join("daily").join(format!("{}.json", yesterday_date));
            let yesterday_report = read_json_file::<crate::models::DailyReport>(&yesterday_file);

            let in_progress: Vec<serde_json::Value> = tasks.iter()
                .filter(|t| t.status == "in_progress")
                .map(|t| task_to_context(t))
                .collect();
            let todo: Vec<serde_json::Value> = tasks.iter()
                .filter(|t| t.status == "todo")
                .map(|t| task_to_context(t))
                .collect();
            let blocked: Vec<serde_json::Value> = tasks.iter()
                .filter(|t| t.blocked)
                .map(|t| task_to_context(t))
                .collect();

            let yesterday_data = yesterday_report.map(|yr| {
                let completed_main: Vec<serde_json::Value> = yr.completed_main.iter().map(|t| task_to_context(t)).collect();
                let completed_side: Vec<serde_json::Value> = yr.completed_side.iter().map(|t| task_to_context(t)).collect();
                let in_prog: Vec<serde_json::Value> = yr.in_progress.iter().map(|t| task_to_context(t)).collect();
                serde_json::json!({
                    "completedMain": completed_main,
                    "completedSide": completed_side,
                    "inProgress": in_prog,
                    "blockers": yr.blockers,
                    "tomorrowPlan": yr.tomorrow_plan,
                    "deviationAnalysis": yr.deviation_analysis,
                    "improvementMeasures": yr.improvement_measures,
                    "llmContent": yr.llm_content,
                    "notes": yr.notes,
                    "focusScore": yr.focus_score,
                })
            });

            Ok(serde_json::json!({
                "date": date,
                "yesterdayReport": yesterday_data,
                "currentTasks": {
                    "inProgress": in_progress,
                    "todo": todo,
                    "blocked": blocked,
                },
            }))
        }
        "generate-daily" => {
            let morning_plan_file = reports_dir(state).join("morning-plan").join(format!("{}.json", date));
            let morning_plan = read_json_file::<crate::models::MorningPlan>(&morning_plan_file);

            let completed_main: Vec<serde_json::Value> = tasks.iter()
                .filter(|t| t.task_type == "main" && t.status == "done" && t.completed_at.as_deref().map(|c| c.starts_with(&date)).unwrap_or(false))
                .map(|t| task_to_context(t))
                .collect();
            let completed_side: Vec<serde_json::Value> = tasks.iter()
                .filter(|t| t.task_type == "side" && t.status == "done" && t.completed_at.as_deref().map(|c| c.starts_with(&date)).unwrap_or(false))
                .map(|t| task_to_context(t))
                .collect();
            let in_progress: Vec<serde_json::Value> = tasks.iter()
                .filter(|t| t.status == "in_progress")
                .map(|t| task_to_context(t))
                .collect();
            let todo: Vec<serde_json::Value> = tasks.iter()
                .filter(|t| t.status == "todo")
                .map(|t| task_to_context(t))
                .collect();
            let blocked: Vec<serde_json::Value> = tasks.iter()
                .filter(|t| t.blocked)
                .map(|t| task_to_context(t))
                .collect();

            let morning_plan_data = morning_plan.map(|mp| {
                let next_actions: Vec<serde_json::Value> = mp.next_actions.iter().map(|a| serde_json::json!({
                    "title": a.title, "type": a.task_type, "priority": a.priority, "progress": a.progress, "blocked": a.blocked, "blockedReason": a.blocked_reason,
                })).collect();
                let waiting: Vec<serde_json::Value> = mp.waiting.iter().map(|w| serde_json::json!({"title": w.title, "reason": w.reason})).collect();
                serde_json::json!({
                    "nextActions": next_actions,
                    "inbox": mp.inbox,
                    "waiting": waiting,
                    "notes": mp.notes,
                })
            });

            Ok(serde_json::json!({
                "date": date,
                "morningPlan": morning_plan_data,
                "completedMain": completed_main,
                "completedSide": completed_side,
                "inProgress": in_progress,
                "todo": todo,
                "blocked": blocked,
                "focusScore": body.get("focusScore"),
                "tomorrowPlan": body.get("tomorrowPlan"),
            }))
        }
        "generate-weekly" => {
            let week_start = body.get("weekStart").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let week_end = body.get("weekEnd").and_then(|v| v.as_str()).unwrap_or("").to_string();

            let daily_dir = reports_dir(state).join("daily");
            let mut daily_reports_data = vec![];
            if let Ok(entries) = fs::read_dir(&daily_dir) {
                for entry in entries.flatten() {
                    if let Some(report) = read_json_file::<crate::models::DailyReport>(&entry.path()) {
                        if report.date >= week_start && report.date <= week_end {
                            let completed_main: Vec<serde_json::Value> = report.completed_main.iter().map(|t| task_to_context(t)).collect();
                            let completed_side: Vec<serde_json::Value> = report.completed_side.iter().map(|t| task_to_context(t)).collect();
                            let in_prog: Vec<serde_json::Value> = report.in_progress.iter().map(|t| task_to_context(t)).collect();
                            daily_reports_data.push(serde_json::json!({
                                "date": report.date,
                                "completedMain": completed_main,
                                "completedSide": completed_side,
                                "inProgress": in_prog,
                                "blockers": report.blockers,
                                "focusScore": report.focus_score,
                                "tomorrowPlan": report.tomorrow_plan,
                                "deviationAnalysis": report.deviation_analysis,
                                "improvementMeasures": report.improvement_measures,
                            }));
                        }
                    }
                }
            }

            Ok(serde_json::json!({
                "weekStart": week_start,
                "weekEnd": week_end,
                "dailyReports": daily_reports_data,
            }))
        }
        "generate-monthly" => {
            let month = body.get("month").and_then(|v| v.as_str()).unwrap_or("").to_string();

            let weekly_dir = reports_dir(state).join("weekly");
            let mut weekly_reports_data = vec![];
            if let Ok(entries) = fs::read_dir(&weekly_dir) {
                for entry in entries.flatten() {
                    if let Some(report) = read_json_file::<crate::models::WeeklyReport>(&entry.path()) {
                        if report.week_start.starts_with(&month) {
                            let stars: Vec<serde_json::Value> = report.star_achievements.iter().map(|s| serde_json::json!({
                                "title": s.title, "situation": s.situation, "task": s.task, "action": s.action, "result": s.result,
                            })).collect();
                            weekly_reports_data.push(serde_json::json!({
                                "weekStart": report.week_start,
                                "weekEnd": report.week_end,
                                "highlights": report.highlights,
                                "issues": report.issues,
                                "nextWeekPlan": report.next_week_plan,
                                "avgFocusScore": report.avg_focus_score,
                                "deviationAnalysis": report.deviation_analysis,
                                "improvementMeasures": report.improvement_measures,
                                "starAchievements": stars,
                            }));
                        }
                    }
                }
            }

            Ok(serde_json::json!({
                "month": month,
                "weeklyReports": weekly_reports_data,
            }))
        }
        _ => Err(format!("Unknown endpoint: {}", endpoint)),
    }
}

fn get_morning_plan_prompt() -> String {
    include_str!("../../../../shared/prompts/morning-plan.txt").to_string()
}

fn get_daily_report_prompt() -> String {
    include_str!("../../../../shared/prompts/daily-report.txt").to_string()
}

fn get_weekly_report_prompt() -> String {
    include_str!("../../../../shared/prompts/weekly-report.txt").to_string()
}

fn get_monthly_report_prompt() -> String {
    include_str!("../../../../shared/prompts/monthly-report.txt").to_string()
}
