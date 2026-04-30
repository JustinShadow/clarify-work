const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ charset: 'utf-8', limit: '10mb' }))
app.use((req, res, next) => {
  res.charset = 'utf-8'
  next()
})

const APP_DATA_DIR = path.resolve(__dirname, '..', 'app-data')
const CONFIG_DIR = path.join(APP_DATA_DIR, 'config')
const DATA_DIR = path.join(APP_DATA_DIR, 'data')
const INTERNAL_REPORTS_DIR = path.join(APP_DATA_DIR, 'reports')
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json')
const TAGS_FILE = path.join(DATA_DIR, 'tags.json')
const REPORTS_DIR = INTERNAL_REPORTS_DIR
const LLM_CONFIG_FILE = path.join(CONFIG_DIR, 'llm-config.json')
const MD_REPORTS_ROOT = path.resolve(__dirname, '..', '..', 'reports')

ensureDir(CONFIG_DIR)
ensureDir(DATA_DIR)
ensureDir(REPORTS_DIR)

function getMdDir(category, dateOrMonth) {
  let year, month
  if (category === 'monthly') {
    year = dateOrMonth.slice(0, 4)
    month = dateOrMonth.slice(5, 7)
    return path.join(MD_REPORTS_ROOT, year, month)
  }
  if (category === 'weekly') {
    const d = new Date(dateOrMonth)
    year = d.getFullYear()
    month = String(d.getMonth() + 1).padStart(2, '0')
  } else {
    year = dateOrMonth.slice(0, 4)
    month = dateOrMonth.slice(5, 7)
  }
  const dir = path.join(MD_REPORTS_ROOT, year, month, category)
  ensureDir(dir)
  return dir
}

function readTasks() {
  if (!fs.existsSync(TASKS_FILE)) return []
  return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'))
}

function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8')
}

function readTags() {
  if (!fs.existsSync(TAGS_FILE)) return []
  return JSON.parse(fs.readFileSync(TAGS_FILE, 'utf-8'))
}

function writeTags(tags) {
  fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf-8')
}

function syncTags(taskTags) {
  const existing = readTags()
  const newTags = taskTags.filter(t => !existing.includes(t))
  if (newTags.length > 0) writeTags([...existing, ...newTags])
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function readLLMConfig() {
  if (!fs.existsSync(LLM_CONFIG_FILE)) {
    return { provider: 'openai', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 4096 }
  }
  return JSON.parse(fs.readFileSync(LLM_CONFIG_FILE, 'utf-8'))
}

function writeLLMConfig(config) {
  fs.writeFileSync(LLM_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

function getYesterday(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

// ========== LLM Service ==========

async function callLLM(messages, onChunk) {
  const config = readLLMConfig()
  if (!config.apiKey) throw new Error('LLM API Key未配置，请在设置页面配置')

  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl })

  const stream = await client.chat.completions.create({
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: true,
  })

  let fullContent = ''
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || ''
    fullContent += delta
    if (onChunk) onChunk(delta)
  }
  return fullContent
}

// ========== Task APIs ==========

app.get('/api/tasks', (req, res) => {
  res.json(readTasks())
})

app.post('/api/tasks', (req, res) => {
  const tasks = readTasks()
  const now = new Date().toISOString()
  const task = {
    id: uuidv4(),
    title: req.body.title || '',
    description: req.body.description || '',
    type: req.body.type || 'main',
    priority: req.body.priority || 'P2',
    status: req.body.status || 'todo',
    progress: req.body.progress ?? 0,
    blocked: req.body.blocked ?? false,
    blockedReason: req.body.blockedReason || '',
    estimatedMinutes: req.body.estimatedMinutes || 30,
    deadline: req.body.deadline || null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    tags: req.body.tags || [],
  }
  if (task.tags.length > 0) syncTags(task.tags)
  tasks.push(task)
  writeTasks(tasks)
  res.json(task)
})

app.put('/api/tasks/:id', (req, res) => {
  const tasks = readTasks()
  const idx = tasks.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Task not found' })
  const now = new Date().toISOString()
  const oldStatus = tasks[idx].status
  const newStatus = req.body.status
  tasks[idx] = {
    ...tasks[idx],
    ...req.body,
    id: tasks[idx].id,
    createdAt: tasks[idx].createdAt,
    updatedAt: now,
    completedAt: newStatus === 'done' && !tasks[idx].completedAt ? now : tasks[idx].completedAt,
  }
  if (newStatus === 'done') {
    tasks[idx].progress = 100
    tasks[idx].blocked = false
    tasks[idx].blockedReason = ''
  }
  if (newStatus && newStatus !== 'done') {
    tasks[idx].completedAt = null
    if (oldStatus === 'done' && tasks[idx].progress === 100 && !req.body.progress && req.body.progress !== 0) {
      tasks[idx].progress = 0
    }
  }
  if (req.body.tags && req.body.tags.length > 0) syncTags(req.body.tags)
  writeTasks(tasks)
  res.json(tasks[idx])
})

app.delete('/api/tasks/:id', (req, res) => {
  let tasks = readTasks()
  tasks = tasks.filter(t => t.id !== req.params.id)
  writeTasks(tasks)
  res.json({ success: true })
})

// ========== Morning Plan APIs ==========

app.get('/api/reports/morning-plan', (req, res) => {
  const dir = path.join(REPORTS_DIR, 'morning-plan')
  ensureDir(dir)
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse()
  const reports = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
  res.json(reports)
})

app.get('/api/reports/morning-plan/:date', (req, res) => {
  const filePath = path.join(REPORTS_DIR, 'morning-plan', `${req.params.date}.json`)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Morning plan not found' })
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')))
})

app.post('/api/reports/morning-plan/generate', (req, res) => {
  const date = req.body.date || getToday()
  const tasks = readTasks()
  const now = new Date().toISOString()
  const yesterday = getYesterday(date)

  let yesterdayReport = null
  const yesterdayFile = path.join(REPORTS_DIR, 'daily', `${yesterday}.json`)
  if (fs.existsSync(yesterdayFile)) {
    yesterdayReport = JSON.parse(fs.readFileSync(yesterdayFile, 'utf-8'))
  }

  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const todo = tasks.filter(t => t.status === 'todo')
  const blocked = tasks.filter(t => t.blocked)
  const doneToday = tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt.startsWith(date))

  const plan = {
    date,
    yesterdayCompleted: yesterdayReport ? (yesterdayReport.completedMain || []).concat(yesterdayReport.completedSide || []).map(t => t.title) : [],
    yesterdayUnfinished: yesterdayReport ? (yesterdayReport.inProgress || []).map(t => ({ title: t.title, type: t.type, progress: t.progress })) : [],
    yesterdayBlockers: yesterdayReport ? (yesterdayReport.blockers || []) : [],
    yesterdayTomorrowPlan: yesterdayReport ? (yesterdayReport.tomorrowPlan || []) : [],
    inbox: req.body.inbox || [],
    nextActions: req.body.nextActions || inProgress.concat(todo).slice(0, 8).map(t => ({
      title: t.title,
      type: t.type,
      priority: t.priority,
      estimatedMinutes: t.estimatedMinutes,
      status: t.status,
      progress: t.progress,
      blocked: t.blocked,
      blockedReason: t.blockedReason,
    })),
    waiting: blocked.map(t => ({ title: t.title, reason: t.blockedReason })),
    notes: req.body.notes || '',
    llmContent: req.body.llmContent || '',
    createdAt: now,
    updatedAt: now,
  }

  const dir = path.join(REPORTS_DIR, 'morning-plan')
  ensureDir(dir)
  fs.writeFileSync(path.join(dir, `${date}.json`), JSON.stringify(plan, null, 2), 'utf-8')

  const md = generateMorningPlanMarkdown(plan)
  const mdDir = getMdDir('daily', date)
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${date}-plan.md`), md, 'utf-8')

  res.json(plan)
})

app.put('/api/reports/morning-plan/:date', (req, res) => {
  const filePath = path.join(REPORTS_DIR, 'morning-plan', `${req.params.date}.json`)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Morning plan not found' })
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const now = new Date().toISOString()
  const updated = { ...existing, ...req.body, date: req.params.date, updatedAt: now }
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8')

  const md = generateMorningPlanMarkdown(updated)
  const mdDir = getMdDir('daily', req.params.date)
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${req.params.date}-plan.md`), md, 'utf-8')

  res.json(updated)
})

function generateMorningPlanMarkdown(plan) {
  const lines = []
  lines.push(`# 🌅 晨间工作规划 - ${plan.date}`)
  lines.push('')
  lines.push('> 基于昨日日报自动生成 + 今日新增输入 | GTD 任务流管理')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 📌 昨日遗留（自动从昨日日报提取）')
  lines.push('')
  lines.push('### ✅ 昨日完成事项回顾')
  lines.push('')
  lines.push('| # | 任务描述 | 所属项目 | 成果简述 |')
  lines.push('|---|---------|----------|---------|')
  if (plan.yesterdayCompleted.length > 0) {
    plan.yesterdayCompleted.forEach((t, i) => lines.push(`| ${i + 1} | ${t} | - | - |`))
  } else {
    lines.push('| - | 无 | - | - |')
  }
  lines.push('')
  lines.push('### ⏳ 昨日未完成 → 今日待续')
  lines.push('')
  lines.push('| # | 任务描述 | 所属项目 | 昨日进度 | 今日目标 |')
  lines.push('|---|---------|----------|---------|---------|')
  if (plan.yesterdayUnfinished.length > 0) {
    plan.yesterdayUnfinished.forEach((t, i) => lines.push(`| ${i + 1} | ${t.title} | ${t.type === 'main' ? '主线' : '支线'} | ${t.progress}% | 推进完成 |`))
  } else {
    lines.push('| - | 无 | - | - | - |')
  }
  lines.push('')
  lines.push('### 🔄 昨日阻塞事项 → 今日跟进')
  lines.push('')
  lines.push('| # | 阻塞事项 | 阻塞原因 | 今日是否可推进 |')
  lines.push('|---|---------|---------|---------------|')
  if (plan.yesterdayBlockers.length > 0) {
    plan.yesterdayBlockers.forEach((b, i) => {
      const reason = typeof b === 'string' ? b : b.reason || '-'
      const title = typeof b === 'string' ? b : b.title || b
      lines.push(`| ${i + 1} | ${title} | ${reason} | 待确认 |`)
    })
  } else {
    lines.push('| - | 无 | - | - |')
  }
  lines.push('')
  lines.push('### 💡 昨日报明日计划 → 今日继承')
  lines.push('')
  lines.push('| # | 计划事项 | 优先级 |')
  lines.push('|---|---------|--------|')
  if (plan.yesterdayTomorrowPlan.length > 0) {
    plan.yesterdayTomorrowPlan.forEach((p, i) => lines.push(`| ${i + 1} | ${typeof p === 'string' ? p : p.title || p} | - |`))
  } else {
    lines.push('| - | 无 | - |')
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 📥 今日新增任务（用户输入）')
  lines.push('')
  lines.push('| # | 任务描述 | 来源 | 优先级 | 预计耗时 |')
  lines.push('|---|---------|------|--------|---------|')
  if (plan.inbox.length > 0) {
    plan.inbox.forEach((t, i) => lines.push(`| ${i + 1} | ${typeof t === 'string' ? t : t.title || t} | - | - | - |`))
  } else {
    lines.push('| - | 无 | - | - | - |')
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 🎯 今日工作安排（按优先级排序）')
  lines.push('')
  lines.push('| # | 任务 | 优先级 | 类型(续/新) | 预计耗时 | 时间段 |')
  lines.push('|---|------|--------|------------|---------|--------|')
  plan.nextActions.forEach((t, i) => {
    const blockedTag = t.blocked ? ' ⛔' : ''
    const typeLabel = t.type === 'main' ? '主线' : '支线'
    const isContinue = plan.yesterdayUnfinished.some(y => y.title === t.title) ? '续' : '新'
    lines.push(`| ${i + 1} | ${t.title}${blockedTag} | ${t.priority} | ${typeLabel}(${isContinue}) | ${t.estimatedMinutes}min | - |`)
  })
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 📝 今日注意事项')
  lines.push('')
  if (plan.notes) {
    lines.push(plan.notes)
  } else {
    lines.push('- 无')
  }
  lines.push('')
  return lines.join('\n')
}

// ========== Daily Report APIs ==========

app.get('/api/reports/daily', (req, res) => {
  const dir = path.join(REPORTS_DIR, 'daily')
  ensureDir(dir)
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse()
  const reports = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
  res.json(reports)
})

app.get('/api/reports/daily/:date', (req, res) => {
  const filePath = path.join(REPORTS_DIR, 'daily', `${req.params.date}.json`)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report not found' })
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')))
})

app.post('/api/reports/daily/generate', (req, res) => {
  const date = req.body.date || getToday()
  const tasks = readTasks()
  const now = new Date().toISOString()

  const completedMain = tasks.filter(t => t.type === 'main' && t.status === 'done' && t.completedAt && t.completedAt.startsWith(date))
  const completedSide = tasks.filter(t => t.type === 'side' && t.status === 'done' && t.completedAt && t.completedAt.startsWith(date))
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const todo = tasks.filter(t => t.status === 'todo')
  const blockedTasks = tasks.filter(t => t.blocked)
  const autoBlockers = blockedTasks.filter(t => t.blockedReason).map(t => `${t.title}：${t.blockedReason}`)

  const morningPlanFile = path.join(REPORTS_DIR, 'morning-plan', `${date}.json`)
  let morningPlan = null
  if (fs.existsSync(morningPlanFile)) {
    morningPlan = JSON.parse(fs.readFileSync(morningPlanFile, 'utf-8'))
  }

  const report = {
    date,
    inbox: req.body.inbox || [],
    completedMain,
    completedSide,
    inProgress,
    todo,
    tomorrowPlan: req.body.tomorrowPlan || [],
    blockers: [...autoBlockers, ...(req.body.blockers || [])],
    notes: req.body.notes || '',
    focusScore: req.body.focusScore || null,
    planCompletionRate: req.body.planCompletionRate || null,
    actualCompletionRate: req.body.actualCompletionRate || null,
    deviationAnalysis: req.body.deviationAnalysis || '',
    improvementMeasures: req.body.improvementMeasures || '',
    morningPlan: morningPlan,
    llmContent: req.body.llmContent || '',
    createdAt: now,
    updatedAt: now,
  }

  const dir = path.join(REPORTS_DIR, 'daily')
  ensureDir(dir)
  fs.writeFileSync(path.join(dir, `${date}.json`), JSON.stringify(report, null, 2), 'utf-8')

  const md = generateDailyMarkdown(report)
  const mdDir = getMdDir('daily', date)
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${date}.md`), md, 'utf-8')

  res.json(report)
})

app.delete('/api/reports/daily/:date', (req, res) => {
  const filePath = path.join(REPORTS_DIR, 'daily', `${req.params.date}.json`)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report not found' })
  fs.unlinkSync(filePath)
  res.json({ success: true })
})

app.put('/api/reports/daily/:date', (req, res) => {
  const filePath = path.join(REPORTS_DIR, 'daily', `${req.params.date}.json`)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report not found' })
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const now = new Date().toISOString()
  const updated = { ...existing, ...req.body, date: req.params.date, updatedAt: now }
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8')

  const md = generateDailyMarkdown(updated)
  const mdDir = getMdDir('daily', req.params.date)
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${req.params.date}.md`), md, 'utf-8')

  res.json(updated)
})

function generateDailyMarkdown(report) {
  const lines = []
  lines.push(`# 📋 日报 - ${report.date}`)
  lines.push('')
  lines.push('> 工作管理框架：GTD（任务流） | STAR（成果记录） | PDCA（复盘改进）')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 📥 Inbox - 今日新增任务')
  lines.push('')
  lines.push('| # | 任务描述 | 来源 | 优先级 |')
  lines.push('|---|---------|------|--------|')
  if (report.inbox && report.inbox.length > 0) {
    report.inbox.forEach((t, i) => lines.push(`| ${i + 1} | ${typeof t === 'string' ? t : t} | - | - |`))
  } else {
    lines.push('| - | 无 | - | - |')
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 🎯 Next Actions - 今日执行')
  lines.push('')
  lines.push('| # | 任务描述 | 所属项目 | 预计耗时 | 状态 |')
  lines.push('|---|---------|----------|---------|------|')
  const allActive = [...(report.inProgress || []), ...(report.todo || [])]
  if (allActive.length === 0) {
    lines.push('| - | 无 | - | - | - |')
  } else {
    allActive.forEach((t, i) => {
      const blockedTag = t.blocked ? ' ⛔阻塞' : ''
      const progressTag = t.progress ? ` (${t.progress}%)` : ''
      const statusLabel = t.status === 'in_progress' ? '进行中' : '待办'
      lines.push(`| ${i + 1} | ${t.title}${blockedTag} | ${t.type === 'main' ? '主线' : '支线'} | ${t.estimatedMinutes}min | ${statusLabel}${progressTag} |`)
    })
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## ✅ Done - 今日完成')
  lines.push('')
  lines.push('| # | 任务描述 | 所属项目 | 实际耗时 | 成果简述 |')
  lines.push('|---|---------|----------|---------|---------|')
  const allDone = [...(report.completedMain || []), ...(report.completedSide || [])]
  if (allDone.length === 0) {
    lines.push('| - | 无 | - | - | - |')
  } else {
    allDone.forEach((t, i) => lines.push(`| ${i + 1} | ${t.title} | ${t.type === 'main' ? '主线' : '支线'} | ${t.estimatedMinutes}min | - |`))
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## ⏳ Waiting - 阻塞/依赖')
  lines.push('')
  lines.push('| # | 阻塞事项 | 原因 | 需要谁协助 | 预计解决时间 |')
  lines.push('|---|---------|------|-----------|-------------|')
  if (report.blockers.length === 0) {
    lines.push('| - | 无 | - | - | - |')
  } else {
    report.blockers.forEach((b, i) => {
      const parts = typeof b === 'string' && b.includes('：') ? b.split('：') : [b, '-']
      lines.push(`| ${i + 1} | ${parts[0]} | ${parts[1] || '-'} | - | - |`)
    })
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 🔍 今日复盘 (PDCA-Check)')
  lines.push('')
  lines.push(`**计划完成率**：${report.planCompletionRate ?? '_'}/5 → 实际完成率：${report.actualCompletionRate ?? '_'}/5`)
  lines.push('')
  lines.push('**偏差分析**：')
  lines.push(`- ${report.deviationAnalysis || '待补充'}`)
  lines.push('')
  lines.push('**改进措施 (PDCA-Act)**：')
  lines.push(`- ${report.improvementMeasures || '待补充'}`)
  lines.push('')
  lines.push(`**专注度评分** (1-5)：${report.focusScore ?? '_'}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 💡 明日计划')
  if (report.tomorrowPlan.length === 0) {
    lines.push('- 待规划')
  } else {
    report.tomorrowPlan.forEach(p => lines.push(`- ${p}`))
  }
  lines.push('')
  if (report.llmContent) {
    lines.push('---')
    lines.push('')
    lines.push('## 🤖 AI 辅助内容')
    lines.push(report.llmContent)
    lines.push('')
  }
  return lines.join('\n')
}

// ========== Weekly Report APIs ==========

app.get('/api/reports/weekly', (req, res) => {
  const dir = path.join(REPORTS_DIR, 'weekly')
  ensureDir(dir)
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse()
  const reports = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
  res.json(reports)
})

app.delete('/api/reports/weekly/:weekStart', (req, res) => {
  const filePath = path.join(REPORTS_DIR, 'weekly', `${req.params.weekStart}.json`)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report not found' })
  fs.unlinkSync(filePath)
  res.json({ success: true })
})

app.post('/api/reports/weekly/generate', (req, res) => {
  const { weekStart, weekEnd } = req.body
  if (!weekStart || !weekEnd) return res.status(400).json({ error: 'weekStart and weekEnd required' })
  const now = new Date().toISOString()

  const dailyDir = path.join(REPORTS_DIR, 'daily')
  ensureDir(dailyDir)
  const dailyFiles = fs.readdirSync(dailyDir).filter(f => f.endsWith('.json')).sort()
  const dailyReports = []
  dailyFiles.forEach(f => {
    const report = JSON.parse(fs.readFileSync(path.join(dailyDir, f), 'utf-8'))
    if (report.date >= weekStart && report.date <= weekEnd) dailyReports.push(report)
  })

  const allCompletedMain = dailyReports.flatMap(r => r.completedMain || [])
  const allCompletedSide = dailyReports.flatMap(r => r.completedSide || [])
  const allBlockers = dailyReports.flatMap(r => r.blockers || [])
  const avgFocus = dailyReports.filter(r => r.focusScore).length > 0
    ? (dailyReports.filter(r => r.focusScore).reduce((s, r) => s + r.focusScore, 0) / dailyReports.filter(r => r.focusScore).length).toFixed(1)
    : null

  const report = {
    weekStart,
    weekEnd,
    dailyReports,
    summary: req.body.summary || '',
    highlights: [...new Set(allCompletedMain.map(t => t.title))],
    issues: [...new Set(allBlockers)],
    nextWeekPlan: req.body.nextWeekPlan || [],
    avgFocusScore: avgFocus,
    deviationAnalysis: req.body.deviationAnalysis || '',
    improvementMeasures: req.body.improvementMeasures || '',
    starAchievements: req.body.starAchievements || [],
    llmContent: req.body.llmContent || '',
    createdAt: now,
    updatedAt: now,
  }

  const dir = path.join(REPORTS_DIR, 'weekly')
  ensureDir(dir)
  fs.writeFileSync(path.join(dir, `${weekStart}.json`), JSON.stringify(report, null, 2), 'utf-8')

  const md = generateWeeklyMarkdown(report)
  const mdDir = getMdDir('weekly', weekStart)
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${weekStart}.md`), md, 'utf-8')

  res.json(report)
})

function generateWeeklyMarkdown(report) {
  const lines = []
  lines.push(`# 📊 周报 - ${report.weekStart} ~ ${report.weekEnd}`)
  lines.push('')
  lines.push(`> 基于 ${report.weekStart} ~ ${report.weekEnd} 的日报汇总`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 📋 本周任务总览')
  lines.push('')
  lines.push('| 类别 | 计划任务数 | 完成任务数 | 完成率 |')
  lines.push('|------|-----------|-----------|--------|')
  const mainCompleted = (report.highlights || []).length
  const totalIssues = (report.issues || []).length
  const dailyCount = report.dailyReports?.length || 0
  lines.push(`| 测试任务（迭代） | - | ${mainCompleted} | - |`)
  lines.push(`| 其他任务（部署/开发等） | - | - | - |`)
  lines.push(`| 合计 | - | ${mainCompleted} | - |`)
  lines.push('')
  lines.push('---')
  lines.push('')
  if (report.starAchievements && report.starAchievements.length > 0) {
    lines.push('## ✅ 关键成果 (STAR格式)')
    lines.push('')
    lines.push('### 测试迭代相关工作')
    lines.push('')
    report.starAchievements.forEach((s, i) => {
      lines.push(`**成果${i + 1}**：${s.title || ''}`)
      lines.push(`- **S (背景)**：${s.situation || '待补充'}`)
      lines.push(`- **T (目标)**：${s.task || '待补充'}`)
      lines.push(`- **A (行动)**：${s.action || '待补充'}`)
      lines.push(`- **R (结果)**：${s.result || '待补充'}`)
      lines.push('')
    })
    lines.push('### 其他随机任务')
    lines.push('')
    lines.push('（待补充）')
    lines.push('')
  }
  lines.push('---')
  lines.push('')
  lines.push('## ⏳ 阻塞事项跟踪')
  lines.push('')
  lines.push('| 阻塞事项 | 持续天数 | 当前状态 | 下周计划 |')
  lines.push('|---------|---------|---------|---------|')
  if (report.issues.length === 0) {
    lines.push('| 无 | - | - | - |')
  } else {
    report.issues.forEach(issue => {
      const parts = typeof issue === 'string' && issue.includes('：') ? issue.split('：') : [issue, '-']
      lines.push(`| ${parts[0]} | - | 未解决 | 待跟进 |`)
    })
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 🔍 周度复盘 (PDCA)')
  lines.push('')
  lines.push('### Check - 偏差分析')
  lines.push('')
  lines.push('| 维度 | 计划 | 实际 | 偏差原因 |')
  lines.push('|------|------|------|---------|')
  lines.push(`| 任务完成率 | - | ${mainCompleted}/${dailyCount} | ${report.deviationAnalysis || '待补充'} |`)
  lines.push(`| 专注度均值 | - | ${report.avgFocusScore || '-'}/5 | - |`)
  lines.push(`| 阻塞解决率 | - | ${totalIssues > 0 ? '0' : '-'}/${totalIssues} | - |`)
  lines.push('')
  lines.push('### Act - 改进措施')
  lines.push('')
  if (report.improvementMeasures) {
    lines.push(`- ${report.improvementMeasures}`)
  } else {
    lines.push('- 待补充')
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 💡 下周计划')
  lines.push('')
  lines.push('| # | 任务 | 优先级 | 预估耗时 |')
  lines.push('|---|------|--------|---------|')
  if (report.nextWeekPlan.length === 0) {
    lines.push('| - | 待规划 | - | - |')
  } else {
    report.nextWeekPlan.forEach((p, i) => lines.push(`| ${i + 1} | ${p} | - | - |`))
  }
  lines.push('')
  if (report.llmContent) {
    lines.push('---')
    lines.push('')
    lines.push('## 🤖 AI 辅助内容')
    lines.push(report.llmContent)
    lines.push('')
  }
  return lines.join('\n')
}

// ========== Monthly Report APIs ==========

app.get('/api/reports/monthly', (req, res) => {
  const dir = path.join(REPORTS_DIR, 'monthly')
  ensureDir(dir)
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse()
  const reports = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
  res.json(reports)
})

app.delete('/api/reports/monthly/:month', (req, res) => {
  const filePath = path.join(REPORTS_DIR, 'monthly', `${req.params.month}.json`)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report not found' })
  fs.unlinkSync(filePath)
  res.json({ success: true })
})

app.post('/api/reports/monthly/generate', (req, res) => {
  const { month } = req.body
  if (!month) return res.status(400).json({ error: 'month required (YYYY-MM)' })
  const now = new Date().toISOString()

  const weeklyDir = path.join(REPORTS_DIR, 'weekly')
  ensureDir(weeklyDir)
  const weeklyFiles = fs.readdirSync(weeklyDir).filter(f => f.endsWith('.json')).sort()
  const weeklyReports = []
  weeklyFiles.forEach(f => {
    const report = JSON.parse(fs.readFileSync(path.join(weeklyDir, f), 'utf-8'))
    if (report.weekStart.startsWith(month)) weeklyReports.push(report)
  })

  const allHighlights = weeklyReports.flatMap(r => r.highlights || [])
  const allIssues = weeklyReports.flatMap(r => r.issues || [])

  const report = {
    month,
    weeklyReports,
    summary: req.body.summary || '',
    highlights: [...new Set(allHighlights)],
    issues: [...new Set(allIssues)],
    nextMonthPlan: req.body.nextMonthPlan || [],
    starAchievements: req.body.starAchievements || [],
    deviationAnalysis: req.body.deviationAnalysis || '',
    improvementMeasures: req.body.improvementMeasures || '',
    llmContent: req.body.llmContent || '',
    createdAt: now,
    updatedAt: now,
  }

  const dir = path.join(REPORTS_DIR, 'monthly')
  ensureDir(dir)
  fs.writeFileSync(path.join(dir, `${month}.json`), JSON.stringify(report, null, 2), 'utf-8')

  const md = generateMonthlyMarkdown(report)
  const mdDir = getMdDir('monthly', month)
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${month}.md`), md, 'utf-8')

  res.json(report)
})

function generateMonthlyMarkdown(report) {
  const lines = []
  lines.push(`# 📈 月报 - ${report.month}`)
  lines.push('')
  lines.push(`> 向上汇报 | ${report.month} 工作总结`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 🎯 月度工作总览')
  lines.push('')
  lines.push('| 类别 | 任务总数 | 完成数 | 完成率 |')
  lines.push('|------|---------|--------|--------|')
  const highlightCount = (report.highlights || []).length
  lines.push('| 测试迭代任务 | - | - | - |')
  lines.push('| 其他任务 | - | - | - |')
  lines.push(`| 合计 | - | ${highlightCount} | - |`)
  lines.push('')
  lines.push('---')
  lines.push('')
  if (report.starAchievements && report.starAchievements.length > 0) {
    lines.push('## 📦 测试迭代工作 (STAR)')
    lines.push('')
    report.starAchievements.forEach((s) => {
      lines.push(`### ${s.title || '迭代版本'}`)
      lines.push(`**S (背景)**：${s.situation || '待补充'}`)
      lines.push(`**T (目标)**：${s.task || '待补充'}`)
      lines.push(`**A (行动)**：${s.action || '待补充'}`)
      lines.push(`**R (结果)**：${s.result || '待补充'}`)
      lines.push('')
    })
  }
  lines.push('## 🔧 其他专项工作 (STAR)')
  lines.push('')
  lines.push('### 专项工作')
  lines.push('**S**：')
  lines.push('**T**：')
  lines.push('**A**：')
  lines.push('**R**：')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 📊 月度数据统计')
  lines.push('')
  lines.push('| 指标 | 本月 | 上月 | 变化趋势 |')
  lines.push('|------|------|------|---------|')
  lines.push('| 测试迭代参与数 | - | - | → |')
  lines.push('| Bug 发现总数 | - | - | → |')
  lines.push('| 严重 Bug 数 | - | - | → |')
  lines.push('| 随机任务数 | - | - | → |')
  lines.push('| 阻塞解决率 | - | - | → |')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 🔍 月度复盘 (PDCA)')
  lines.push('')
  lines.push('### Check')
  lines.push('')
  lines.push('- **亮点**：')
  if (report.highlights.length > 0) {
    report.highlights.forEach(h => lines.push(`  - ${h}`))
  } else {
    lines.push('  - 待补充')
  }
  lines.push('- **不足**：')
  lines.push('  - 待补充')
  lines.push('- **意外发现**：')
  lines.push('  - 待补充')
  lines.push('')
  lines.push('### Act - 下月改进')
  lines.push('')
  if (report.improvementMeasures) {
    lines.push(`- ${report.improvementMeasures}`)
  } else {
    lines.push('- 待补充')
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## 🚀 下月展望')
  if (report.nextMonthPlan.length === 0) {
    lines.push('- 待规划')
  } else {
    report.nextMonthPlan.forEach(p => lines.push(`- ${p}`))
  }
  lines.push('')
  if (report.llmContent) {
    lines.push('---')
    lines.push('')
    lines.push('## 🤖 AI 辅助内容')
    lines.push(report.llmContent)
    lines.push('')
  }
  return lines.join('\n')
}

// ========== Tags APIs ==========

app.get('/api/tags', (req, res) => {
  res.json(readTags())
})

app.post('/api/tags', (req, res) => {
  const existing = readTags()
  const newTags = (req.body.tags || []).filter(t => !existing.includes(t))
  if (newTags.length > 0) {
    const updated = [...existing, ...newTags]
    writeTags(updated)
    res.json(updated)
  } else {
    res.json(existing)
  }
})

app.delete('/api/tags/:name', (req, res) => {
  let tags = readTags()
  tags = tags.filter(t => t !== req.params.name)
  writeTags(tags)
  res.json(tags)
})

// ========== Stats ==========

app.get('/api/stats', (req, res) => {
  const tasks = readTasks()
  const today = getToday()
  const totalEstimated = tasks.filter(t => t.status !== 'done').reduce((sum, t) => sum + t.estimatedMinutes, 0)
  const completedToday = tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt.startsWith(today)).length
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.deadline && t.deadline < today)

  res.json({
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.blocked).length,
    done: tasks.filter(t => t.status === 'done').length,
    totalEstimatedMinutes: totalEstimated,
    completedToday,
    overdueCount: overdueTasks.length,
    overdueTasks,
    mainCount: tasks.filter(t => t.type === 'main' && t.status !== 'done').length,
    sideCount: tasks.filter(t => t.type === 'side' && t.status !== 'done').length,
  })
})

// ========== LLM Config APIs ==========

app.get('/api/llm/config', (req, res) => {
  const config = readLLMConfig()
  res.json({ ...config, apiKey: config.apiKey ? '••••••••' + config.apiKey.slice(-4) : '' })
})

app.put('/api/llm/config', (req, res) => {
  const existing = readLLMConfig()
  const updated = { ...existing, ...req.body }
  if (req.body.apiKey && req.body.apiKey.includes('••')) {
    updated.apiKey = existing.apiKey
  }
  writeLLMConfig(updated)
  res.json({ ...updated, apiKey: updated.apiKey ? '••••••••' + updated.apiKey.slice(-4) : '' })
})

app.post('/api/llm/test', async (req, res) => {
  try {
    const result = await callLLM([{ role: 'user', content: '回复"连接成功"' }])
    res.json({ success: true, message: result.trim() })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

// ========== LLM Generate APIs (Streaming) ==========

app.post('/api/llm/generate-morning-plan', async (req, res) => {
  const date = req.body.date || getToday()
  const tasks = readTasks()
  const yesterday = getYesterday(date)
  let yesterdayReport = null
  const yesterdayFile = path.join(REPORTS_DIR, 'daily', `${yesterday}.json`)
  if (fs.existsSync(yesterdayFile)) {
    yesterdayReport = JSON.parse(fs.readFileSync(yesterdayFile, 'utf-8'))
  }

  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const todo = tasks.filter(t => t.status === 'todo')
  const blocked = tasks.filter(t => t.blocked)

  const contextData = {
    date,
    yesterdayReport: yesterdayReport ? {
      completedMain: yesterdayReport.completedMain?.map(t => t.title) || [],
      completedSide: yesterdayReport.completedSide?.map(t => t.title) || [],
      inProgress: yesterdayReport.inProgress?.map(t => `${t.title}(${t.progress}%)`) || [],
      blockers: yesterdayReport.blockers || [],
      tomorrowPlan: yesterdayReport.tomorrowPlan || [],
    } : null,
    currentTasks: {
      inProgress: inProgress.map(t => `${t.title} [${t.type}] P${t.priority.includes('P') ? t.priority.slice(1) : t.priority} ${t.progress}% ${t.blocked ? '阻塞:' + t.blockedReason : ''}`),
      todo: todo.map(t => `${t.title} [${t.type}] ${t.priority}`),
      blocked: blocked.map(t => `${t.title}: ${t.blockedReason}`),
    },
    userInput: req.body.userInput || '',
  }

  const systemPrompt = `你是一位专业的测试团队工作规划助手，基于GTD(任务流管理)框架帮助用户生成晨间工作规划。

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
- 表格必须填写，无数据时填"无"，不得留空`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(contextData, null, 2) },
      ],
      (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }
    )
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

app.post('/api/llm/generate-daily', async (req, res) => {
  const date = req.body.date || getToday()
  const tasks = readTasks()
  const morningPlanFile = path.join(REPORTS_DIR, 'morning-plan', `${date}.json`)
  let morningPlan = null
  if (fs.existsSync(morningPlanFile)) {
    morningPlan = JSON.parse(fs.readFileSync(morningPlanFile, 'utf-8'))
  }

  const completedMain = tasks.filter(t => t.type === 'main' && t.status === 'done' && t.completedAt && t.completedAt.startsWith(date))
  const completedSide = tasks.filter(t => t.type === 'side' && t.status === 'done' && t.completedAt && t.completedAt.startsWith(date))
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const todo = tasks.filter(t => t.status === 'todo')
  const blocked = tasks.filter(t => t.blocked)

  const contextData = {
    date,
    morningPlan: morningPlan ? {
      nextActions: morningPlan.nextActions?.map(t => t.title) || [],
      inbox: morningPlan.inbox || [],
      waiting: morningPlan.waiting || [],
    } : null,
    completedMain: completedMain.map(t => t.title),
    completedSide: completedSide.map(t => t.title),
    inProgress: inProgress.map(t => `${t.title} [${t.type}] ${t.progress}% ${t.blocked ? '阻塞:' + t.blockedReason : ''}`),
    todo: todo.map(t => t.title),
    blocked: blocked.map(t => `${t.title}: ${t.blockedReason}`),
    userInput: req.body.userInput || '',
    focusScore: req.body.focusScore,
    tomorrowPlan: req.body.tomorrowPlan || [],
  }

  const systemPrompt = `你是一位专业的测试团队工作日报助手，基于GTD+PDCA混合框架帮助用户生成结构化日报。

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
- 仅输出纯Markdown格式的日报内容正文`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(contextData, null, 2) },
      ],
      (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }
    )
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

app.post('/api/llm/generate-weekly', async (req, res) => {
  const { weekStart, weekEnd } = req.body
  if (!weekStart || !weekEnd) return res.status(400).json({ error: 'weekStart and weekEnd required' })

  const dailyDir = path.join(REPORTS_DIR, 'daily')
  ensureDir(dailyDir)
  const dailyFiles = fs.readdirSync(dailyDir).filter(f => f.endsWith('.json')).sort()
  const dailyReports = []
  dailyFiles.forEach(f => {
    const report = JSON.parse(fs.readFileSync(path.join(dailyDir, f), 'utf-8'))
    if (report.date >= weekStart && report.date <= weekEnd) dailyReports.push(report)
  })

  const contextData = {
    weekStart,
    weekEnd,
    dailyReports: dailyReports.map(r => ({
      date: r.date,
      completedMain: (r.completedMain || []).map(t => t.title),
      completedSide: (r.completedSide || []).map(t => t.title),
      inProgress: (r.inProgress || []).map(t => `${t.title}(${t.progress}%)`),
      blockers: r.blockers || [],
      focusScore: r.focusScore,
      tomorrowPlan: r.tomorrowPlan || [],
    })),
    userInput: req.body.userInput || '',
  }

  const systemPrompt = `你是一位专业的测试团队周报助手，基于PDCA+STAR框架帮助用户生成结构化周报。

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
- 仅输出纯Markdown格式的周报内容正文`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(contextData, null, 2) },
      ],
      (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }
    )
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

app.post('/api/llm/generate-monthly', async (req, res) => {
  const { month } = req.body
  if (!month) return res.status(400).json({ error: 'month required' })

  const weeklyDir = path.join(REPORTS_DIR, 'weekly')
  ensureDir(weeklyDir)
  const weeklyFiles = fs.readdirSync(weeklyDir).filter(f => f.endsWith('.json')).sort()
  const weeklyReports = []
  weeklyFiles.forEach(f => {
    const report = JSON.parse(fs.readFileSync(path.join(weeklyDir, f), 'utf-8'))
    if (report.weekStart.startsWith(month)) weeklyReports.push(report)
  })

  const contextData = {
    month,
    weeklyReports: weeklyReports.map(r => ({
      weekStart: r.weekStart,
      weekEnd: r.weekEnd,
      highlights: r.highlights || [],
      issues: r.issues || [],
      nextWeekPlan: r.nextWeekPlan || [],
      avgFocusScore: r.avgFocusScore,
    })),
    userInput: req.body.userInput || '',
  }

  const systemPrompt = `你是一位专业的测试团队月报助手，基于STAR框架帮助用户生成面向上级的月度工作汇报。

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
- 仅输出纯Markdown格式的月报内容正文`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(contextData, null, 2) },
      ],
      (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }
    )
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
