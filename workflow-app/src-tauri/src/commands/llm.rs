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
            max_tokens: 4096,
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
        "messages": [{"role": "user", "content": "回复\"连接成功\""}],
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

    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));
    let request_body = serde_json::json!({
        "model": config.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": serde_json::to_string_pretty(&context_data).unwrap_or_default()}
        ],
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

            let in_progress: Vec<String> = tasks.iter()
                .filter(|t| t.status == "in_progress")
                .map(|t| format!("{} [{}] P{} {}%{}", t.title, t.task_type, t.priority.trim_start_matches('P'), t.progress, if t.blocked { format!(" 阻塞:{}", t.blocked_reason) } else { String::new() }))
                .collect();
            let todo: Vec<String> = tasks.iter()
                .filter(|t| t.status == "todo")
                .map(|t| format!("{} [{}] {}", t.title, t.task_type, t.priority))
                .collect();
            let blocked: Vec<String> = tasks.iter()
                .filter(|t| t.blocked)
                .map(|t| format!("{}: {}", t.title, t.blocked_reason))
                .collect();

            let yesterday_data = yesterday_report.map(|yr| serde_json::json!({
                "completedMain": yr.completed_main.iter().map(|t| &t.title).collect::<Vec<_>>(),
                "completedSide": yr.completed_side.iter().map(|t| &t.title).collect::<Vec<_>>(),
                "inProgress": yr.in_progress.iter().map(|t| format!("{}({}%)", t.title, t.progress)).collect::<Vec<_>>(),
                "blockers": yr.blockers,
                "tomorrowPlan": yr.tomorrow_plan,
            }));

            Ok(serde_json::json!({
                "date": date,
                "yesterdayReport": yesterday_data,
                "currentTasks": {
                    "inProgress": in_progress,
                    "todo": todo,
                    "blocked": blocked,
                },
                "userInput": body.get("userInput").and_then(|v| v.as_str()).unwrap_or(""),
            }))
        }
        "generate-daily" => {
            let morning_plan_file = reports_dir(state).join("morning-plan").join(format!("{}.json", date));
            let morning_plan = read_json_file::<crate::models::MorningPlan>(&morning_plan_file);

            let completed_main: Vec<String> = tasks.iter()
                .filter(|t| t.task_type == "main" && t.status == "done" && t.completed_at.as_deref().map(|c| c.starts_with(&date)).unwrap_or(false))
                .map(|t| t.title.clone()).collect();
            let completed_side: Vec<String> = tasks.iter()
                .filter(|t| t.task_type == "side" && t.status == "done" && t.completed_at.as_deref().map(|c| c.starts_with(&date)).unwrap_or(false))
                .map(|t| t.title.clone()).collect();
            let in_progress: Vec<String> = tasks.iter()
                .filter(|t| t.status == "in_progress")
                .map(|t| format!("{} [{}] {}%{}", t.title, t.task_type, t.progress, if t.blocked { format!(" 阻塞:{}", t.blocked_reason) } else { String::new() }))
                .collect();
            let todo: Vec<String> = tasks.iter().filter(|t| t.status == "todo").map(|t| t.title.clone()).collect();
            let blocked: Vec<String> = tasks.iter().filter(|t| t.blocked).map(|t| format!("{}: {}", t.title, t.blocked_reason)).collect();

            let morning_plan_data = morning_plan.map(|mp| serde_json::json!({
                "nextActions": mp.next_actions.iter().map(|a| &a.title).collect::<Vec<_>>(),
                "inbox": mp.inbox,
                "waiting": mp.waiting.iter().map(|w| &w.title).collect::<Vec<_>>(),
            }));

            Ok(serde_json::json!({
                "date": date,
                "morningPlan": morning_plan_data,
                "completedMain": completed_main,
                "completedSide": completed_side,
                "inProgress": in_progress,
                "todo": todo,
                "blocked": blocked,
                "userInput": body.get("userInput").and_then(|v| v.as_str()).unwrap_or(""),
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
                            daily_reports_data.push(serde_json::json!({
                                "date": report.date,
                                "completedMain": report.completed_main.iter().map(|t| &t.title).collect::<Vec<_>>(),
                                "completedSide": report.completed_side.iter().map(|t| &t.title).collect::<Vec<_>>(),
                                "inProgress": report.in_progress.iter().map(|t| format!("{}({}%)", t.title, t.progress)).collect::<Vec<_>>(),
                                "blockers": report.blockers,
                                "focusScore": report.focus_score,
                                "tomorrowPlan": report.tomorrow_plan,
                            }));
                        }
                    }
                }
            }

            Ok(serde_json::json!({
                "weekStart": week_start,
                "weekEnd": week_end,
                "dailyReports": daily_reports_data,
                "userInput": body.get("userInput").and_then(|v| v.as_str()).unwrap_or(""),
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
                            weekly_reports_data.push(serde_json::json!({
                                "weekStart": report.week_start,
                                "weekEnd": report.week_end,
                                "highlights": report.highlights,
                                "issues": report.issues,
                                "nextWeekPlan": report.next_week_plan,
                                "avgFocusScore": report.avg_focus_score,
                            }));
                        }
                    }
                }
            }

            Ok(serde_json::json!({
                "month": month,
                "weeklyReports": weekly_reports_data,
                "userInput": body.get("userInput").and_then(|v| v.as_str()).unwrap_or(""),
            }))
        }
        _ => Err(format!("Unknown endpoint: {}", endpoint)),
    }
}

fn get_morning_plan_prompt() -> String {
    r#"你是一位专业的测试团队工作规划助手，基于GTD(任务流管理)框架帮助用户生成晨间工作规划。

严格按以下模板结构输出，分区名称和表格列定义不得更改：

## 📌 昨日遗留

### ✅ 昨日完成事项回顾
| # | 任务描述 | 所属项目 | 成果简述 |
|---|---------|----------|---------|
（从昨日日报Done区提取，若无昨日日报则填"无"）

### ⏳ 昨日未完成 → 今日待续
| # | 任务描述 | 所属项目 | 昨日进度 | 今日目标 |
|---|---------|----------|---------|---------|
（从昨日日报Next Actions中未完成任务提取，若无则填"无"）

### 🔄 昨日阻塞事项 → 今日跟进
| # | 阻塞事项 | 阻塞原因 | 今日是否可推进 |
|---|---------|---------|---------------|
（从昨日日报Waiting区提取，若无则填"无"）

### 💡 昨日报明日计划 → 今日继承
| # | 计划事项 | 优先级 |
|---|---------|--------|
（从昨日日报明日计划提取，若无则填"无"）

## 📥 今日新增任务
| # | 任务描述 | 来源 | 优先级 | 预计耗时 |
|---|---------|------|--------|---------|

## 🎯 今日工作安排（按优先级排序）
| # | 任务 | 优先级 | 类型(续/新) | 预计耗时 | 时间段 |
|---|------|--------|------------|---------|--------|
（合并昨日遗留+今日新增，按优先级排序）

## 📝 今日注意事项
- 关键提醒和风险提示

严格遵守以下输出规则：
- 每个分区必须使用## 标题，子分区使用### 标题，不得更改分区名称
- 所有任务数据必须使用Markdown表格，不得使用列表替代
- 不要输出任何寒暄、开场白、总结语（如"好的，根据…"、"以下是…"、"希望对您有帮助"等）
- 不要输出thinking内容、推理过程或分析说明
- 仅输出纯Markdown格式的规划内容正文
- 表格必须填写，无数据时填"无"，不得留空"#.to_string()
}

fn get_daily_report_prompt() -> String {
    r#"你是一位专业的测试团队工作日报助手，基于GTD+PDCA混合框架帮助用户生成结构化日报。

严格按以下模板结构输出，分区名称和表格列定义不得更改：

## 📥 Inbox - 今日新增任务
| # | 任务描述 | 来源 | 优先级 |
|---|---------|------|--------|

## 🎯 Next Actions - 今日执行
| # | 任务描述 | 所属项目 | 预计耗时 | 状态 |
|---|---------|----------|---------|------|
（状态填：进行中/已完成）

## ✅ Done - 今日完成
| # | 任务描述 | 所属项目 | 实际耗时 | 成果简述 |
|---|---------|----------|---------|---------|

## ⏳ Waiting - 阻塞/依赖
| # | 阻塞事项 | 原因 | 需要谁协助 | 预计解决时间 |
|---|---------|------|-----------|-------------|

## 🔍 今日复盘 (PDCA-Check)
**计划完成率**：_/5 → 实际完成率：_/5

**偏差分析**：
- （对照晨间规划，分析计划vs实际的偏差及原因）

**改进措施 (PDCA-Act)**：
- （基于偏差分析提出具体改进措施）

**专注度评分** (1-5)：__

## 💡 明日计划
- （列出明日待办事项）

如果用户提供了晨间规划，必须对照计划做偏差分析。PDCA-Check区每个字段都必须填写，不得留空。

严格遵守以下输出规则：
- 每个分区必须使用## 标题，不得更改分区名称
- 所有任务数据必须使用Markdown表格，不得使用列表替代
- PDCA-Check区为必填项，计划完成率、偏差分析、改进措施、专注度评分均不得留空
- 不要输出任何寒暄、开场白、总结语（如"好的，根据…"、"以下是…"、"希望对您有帮助"等）
- 不要输出thinking内容、推理过程或分析说明
- 仅输出纯Markdown格式的日报内容正文"#.to_string()
}

fn get_weekly_report_prompt() -> String {
    r#"你是一位专业的测试团队周报助手，基于PDCA+STAR框架帮助用户生成结构化周报。

严格按以下模板结构输出，分区名称和表格列定义不得更改：

## 📋 本周任务总览
| 类别 | 计划任务数 | 完成任务数 | 完成率 |
|------|-----------|-----------|--------|
| 测试任务（迭代） | | | |
| 其他任务（部署/开发等） | | | |
| 合计 | | | |

## ✅ 关键成果 (STAR格式)

### 测试迭代相关工作

**成果1**：{{title}}
- **S (背景)**：
- **T (目标)**：
- **A (行动)**：
- **R (结果)**：

（每项关键成果必须完整填写STAR四个维度，不得省略任一维度）

### 其他随机任务

**成果X**：{{title}}
- **S**：
- **T**：
- **A**：
- **R**：

## ⏳ 阻塞事项跟踪
| 阻塞事项 | 持续天数 | 当前状态 | 下周计划 |
|---------|---------|---------|---------|

## 🔍 周度复盘 (PDCA)

### Check - 偏差分析
| 维度 | 计划 | 实际 | 偏差原因 |
|------|------|------|---------|
| 任务完成率 | | | |
| 专注度均值 | | | |
| 阻塞解决率 | | | |

### Act - 改进措施
-

## 💡 下周计划
| # | 任务 | 优先级 | 预估耗时 |
|---|------|--------|---------|

严格遵守以下输出规则：
- 每个分区必须使用## 标题，子分区使用### 标题，不得更改分区名称
- 所有统计数据和任务列表必须使用Markdown表格，不得使用列表替代
- STAR成果必须完整填写四个维度(S/T/A/R)，不得省略
- PDCA的Check维度必须用表格呈现三个维度的对比
- 不要输出任何寒暄、开场白、总结语（如"好的，根据…"、"以下是…"、"希望对您有帮助"等）
- 不要输出thinking内容、推理过程或分析说明
- 仅输出纯Markdown格式的周报内容正文"#.to_string()
}

fn get_monthly_report_prompt() -> String {
    r#"你是一位专业的测试团队月报助手，基于STAR框架帮助用户生成面向上级的月度工作汇报。

严格按以下模板结构输出，分区名称和表格列定义不得更改：

## 🎯 月度工作总览
| 类别 | 任务总数 | 完成数 | 完成率 |
|------|---------|--------|--------|
| 测试迭代任务 | | | |
| 其他任务 | | | |
| 合计 | | | |

## 📦 测试迭代工作 (STAR)

### {{version/iteration_name}}
**S (背景)**：{{iteration背景}}
**T (目标)**：{{iteration目标}}
**A (行动)**：
- 测试覆盖 {{X}} 个功能模块
- 执行 {{X}} 条测试用例
- 发现 {{X}} 个 Bug（{{严重}}/{{一般}}/{{轻微}}）

**R (结果)**：
- Bug 修复率：{{X%}}
- 测试通过率：{{X%}}
- 版本发布状态：{{已发布/待发布}}

（按迭代版本分组，每个版本完整填写STAR四维度）

## 🔧 其他专项工作 (STAR)

### {{task_name}}
**S**：
**T**：
**A**：
**R**：

## 📊 月度数据统计
| 指标 | 本月 | 上月 | 变化趋势 |
|------|------|------|---------|
| 测试迭代参与数 | | | ↑/↓/→ |
| Bug 发现总数 | | | ↑/↓/→ |
| 严重 Bug 数 | | | ↑/↓/→ |
| 随机任务数 | | | ↑/↓/→ |
| 阻塞解决率 | | | ↑/↓/→ |

## 🔍 月度复盘 (PDCA)

### Check
- **亮点**：
- **不足**：
- **意外发现**：

### Act - 下月改进
-

## 🚀 下月展望
-

严格遵守以下输出规则：
- 每个分区必须使用## 标题，子分区使用### 标题，不得更改分区名称
- 所有统计数据必须使用Markdown表格，不得使用列表替代
- 月度数据统计必须包含"变化趋势"列，填↑/↓/→
- STAR成果按迭代版本分组，每个版本完整填写四个维度
- PDCA的Check必须包含亮点、不足、意外发现三个维度，不得省略
- 重点向上汇报工作价值，突出成果和影响
- 不要输出任何寒暄、开场白、总结语（如"好的，根据…"、"以下是…"、"希望对您有帮助"等）
- 不要输出thinking内容、推理过程或分析说明
- 仅输出纯Markdown格式的月报内容正文"#.to_string()
}
