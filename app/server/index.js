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
const PROMPTS_DIR = path.resolve(__dirname, '..', '..', 'shared', 'prompts')
const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'shared', 'templates')

function loadPrompt(name) {
  return fs.readFileSync(path.join(PROMPTS_DIR, `${name}.txt`), 'utf-8')
}

function loadTemplate(name) {
  return JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.json`), 'utf-8'))
}

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
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  const tpl = loadTemplate('morning-plan')
  const lines = []
  lines.push(tpl.title.replace('{{date}}', plan.date))
  lines.push('')
  lines.push(tpl.subtitle)
  lines.push('')
  lines.push('---')
  lines.push('')

  const yesterdayUnfinished = plan.yesterdayUnfinished || []
  const yesterdayBlockers = plan.yesterdayBlockers || []

  const yesterdaySection = tpl.sections.find(s => s.id === 'yesterdayUnfinished')
  lines.push(yesterdaySection.heading)
  lines.push('')
  lines.push('| ' + yesterdaySection.columns.join(' | ') + ' |')
  lines.push('|' + yesterdaySection.columns.map(() => '---').join('|') + '|')
  if (yesterdayUnfinished.length > 0) {
    yesterdayUnfinished.forEach((t, i) => {
      const title = typeof t === 'string' ? t : t.title
      const progress = typeof t === 'object' && t.progress !== undefined ? t.progress : '-'
      const priority = (plan.nextActions.find(n => n.title === title) || {}).priority || '-'
      lines.push(`| ${i + 1} | ${title} | ${priority} | ${progress}% | 推进完成 | 继续执行 |`)
    })
  } else {
    lines.push('| ' + yesterdaySection.emptyRow.join(' | ') + ' |')
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const inboxSection = tpl.sections.find(s => s.id === 'inbox')
  lines.push(inboxSection.heading)
  lines.push('')
  lines.push('| ' + inboxSection.columns.join(' | ') + ' |')
  lines.push('|' + inboxSection.columns.map(() => '---').join('|') + '|')
  if (plan.inbox.length > 0) {
    plan.inbox.forEach((t, i) => lines.push(`| ${i + 1} | ${typeof t === 'string' ? t : t.title || t} | - | - | - | 可直接开始 |`))
  } else {
    lines.push('| ' + inboxSection.emptyRow.join(' | ') + ' |')
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const actionable = plan.nextActions.filter(t => !t.blocked)
  const blocked = plan.nextActions.filter(t => t.blocked)

  const actionsSection = tpl.sections.find(s => s.id === 'nextActions')
  lines.push(actionsSection.heading)
  lines.push('')
  lines.push('| ' + actionsSection.columns.join(' | ') + ' |')
  lines.push('|' + actionsSection.columns.map(() => '---').join('|') + '|')
  actionable.forEach((t, i) => {
    lines.push(`| ${i + 1} | ${t.title} | ${t.priority} | ${t.progress}% | ${t.estimatedMinutes}min | - | 继续执行 |`)
  })
  if (actionable.length === 0) {
    lines.push('| ' + actionsSection.emptyRow.join(' | ') + ' |')
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const waitingSection = tpl.sections.find(s => s.id === 'waiting')
  lines.push(waitingSection.heading)
  lines.push('')
  lines.push('| ' + waitingSection.columns.join(' | ') + ' |')
  lines.push('|' + waitingSection.columns.map(() => '---').join('|') + '|')
  if (blocked.length > 0) {
    blocked.forEach((t, i) => {
      lines.push(`| ${i + 1} | ${t.title} | ${t.blockedReason} | 主动跟进 | 待确认 | 验证测试 |`)
    })
  } else if (plan.waiting && plan.waiting.length > 0) {
    plan.waiting.forEach((t, i) => {
      lines.push(`| ${i + 1} | ${t.title} | ${t.reason} | 主动跟进 | 待确认 | 验证测试 |`)
    })
  } else {
    lines.push('| ' + waitingSection.emptyRow.join(' | ') + ' |')
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const risksSection = tpl.sections.find(s => s.id === 'risks')
  lines.push(risksSection.heading)
  lines.push('')
  lines.push('| ' + risksSection.columns.join(' | ') + ' |')
  lines.push('|' + risksSection.columns.map(() => '---').join('|') + '|')
  if (blocked.length > 0) {
    blocked.forEach((t, i) => {
      lines.push(`| ${i + 1} | ${t.title}持续阻塞 | 影响进度 | 若持续阻塞则转入其他任务 |`)
    })
  } else {
    lines.push('| ' + risksSection.emptyRow.join(' | ') + ' |')
  }
  lines.push('')

  if (plan.llmContent) {
    const llmSection = tpl.sections.find(s => s.id === 'llmContent')
    lines.push('---')
    lines.push('')
    lines.push(llmSection.heading)
    lines.push('')
    lines.push(plan.llmContent)
    lines.push('')
  }

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
  const tpl = loadTemplate('daily-report')
  const lines = []
  lines.push(tpl.title.replace('{{date}}', report.date))
  lines.push('')
  lines.push(tpl.subtitle)
  lines.push('')
  lines.push('---')
  lines.push('')

  const inboxSection = tpl.sections.find(s => s.id === 'inbox')
  lines.push(inboxSection.heading)
  lines.push('')
  lines.push('| ' + inboxSection.columns.join(' | ') + ' |')
  lines.push('|' + inboxSection.columns.map(() => '---').join('|') + '|')
  if (report.inbox && report.inbox.length > 0) {
    report.inbox.forEach((t, i) => lines.push(`| ${i + 1} | ${typeof t === 'string' ? t : t} | - | - |`))
  } else {
    lines.push('| ' + inboxSection.emptyRow.join(' | ') + ' |')
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const actionsSection = tpl.sections.find(s => s.id === 'nextActions')
  lines.push(actionsSection.heading)
  lines.push('')
  lines.push('| ' + actionsSection.columns.join(' | ') + ' |')
  lines.push('|' + actionsSection.columns.map(() => '---').join('|') + '|')
  const allActive = [...(report.inProgress || []), ...(report.todo || [])]
  if (allActive.length === 0) {
    lines.push('| ' + actionsSection.emptyRow.join(' | ') + ' |')
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

  const doneSection = tpl.sections.find(s => s.id === 'done')
  lines.push(doneSection.heading)
  lines.push('')
  lines.push('| ' + doneSection.columns.join(' | ') + ' |')
  lines.push('|' + doneSection.columns.map(() => '---').join('|') + '|')
  const allDone = [...(report.completedMain || []), ...(report.completedSide || [])]
  if (allDone.length === 0) {
    lines.push('| ' + doneSection.emptyRow.join(' | ') + ' |')
  } else {
    allDone.forEach((t, i) => lines.push(`| ${i + 1} | ${t.title} | ${t.type === 'main' ? '主线' : '支线'} | ${t.estimatedMinutes}min | - |`))
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const waitingSection = tpl.sections.find(s => s.id === 'waiting')
  lines.push(waitingSection.heading)
  lines.push('')
  lines.push('| ' + waitingSection.columns.join(' | ') + ' |')
  lines.push('|' + waitingSection.columns.map(() => '---').join('|') + '|')
  if (report.blockers.length === 0) {
    lines.push('| ' + waitingSection.emptyRow.join(' | ') + ' |')
  } else {
    report.blockers.forEach((b, i) => {
      const parts = typeof b === 'string' && b.includes('：') ? b.split('：') : [b, '-']
      lines.push(`| ${i + 1} | ${parts[0]} | ${parts[1] || '-'} | - | - |`)
    })
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const pdcaSection = tpl.sections.find(s => s.id === 'pdca')
  lines.push(pdcaSection.heading)
  lines.push('')
  lines.push(pdcaSection.fields.planCompletionRate
    .replace('{{plan}}', report.planCompletionRate ?? '_')
    .replace('{{actual}}', report.actualCompletionRate ?? '_'))
  lines.push('')
  lines.push(pdcaSection.fields.deviationAnalysis)
  lines.push(`- ${report.deviationAnalysis || '待补充'}`)
  lines.push('')
  lines.push(pdcaSection.fields.improvementMeasures)
  lines.push(`- ${report.improvementMeasures || '待补充'}`)
  lines.push('')
  lines.push(pdcaSection.fields.focusScore.replace('{{score}}', report.focusScore ?? '_'))
  lines.push('')
  lines.push('---')
  lines.push('')

  const planSection = tpl.sections.find(s => s.id === 'tomorrowPlan')
  lines.push(planSection.heading)
  if (report.tomorrowPlan.length === 0) {
    lines.push('- ' + planSection.emptyItem)
  } else {
    report.tomorrowPlan.forEach(p => lines.push(`- ${p}`))
  }
  lines.push('')
  if (report.llmContent) {
    const llmSection = tpl.sections.find(s => s.id === 'llmContent')
    lines.push('---')
    lines.push('')
    lines.push(llmSection.heading)
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
  const tpl = loadTemplate('weekly-report')
  const lines = []
  lines.push(tpl.title.replace('{{weekStart}}', report.weekStart).replace('{{weekEnd}}', report.weekEnd))
  lines.push('')
  lines.push(tpl.subtitle.replace('{{weekStart}}', report.weekStart).replace('{{weekEnd}}', report.weekEnd))
  lines.push('')
  lines.push('---')
  lines.push('')

  const overviewSection = tpl.sections.find(s => s.id === 'overview')
  lines.push(overviewSection.heading)
  lines.push('')
  lines.push('| ' + overviewSection.columns.join(' | ') + ' |')
  lines.push('|' + overviewSection.columns.map(() => '---').join('|') + '|')
  const mainCompleted = (report.highlights || []).length
  const totalIssues = (report.issues || []).length
  const dailyCount = report.dailyReports?.length || 0
  overviewSection.staticRows.forEach(row => {
    lines.push('| ' + row.map(cell => cell.replace('{{mainCompleted}}', mainCompleted)).join(' | ') + ' |')
  })
  lines.push('')
  lines.push('---')
  lines.push('')

  const starSection = tpl.sections.find(s => s.id === 'starAchievements')
  if (report.starAchievements && report.starAchievements.length > 0) {
    lines.push(starSection.heading)
    lines.push('')
    const iterSub = starSection.subSections.find(s => s.id === 'iteration')
    lines.push(iterSub.heading)
    lines.push('')
    report.starAchievements.forEach((s, i) => {
      lines.push(`**成果${i + 1}**：${s.title || ''}`)
      lines.push(`- **S (背景)**：${s.situation || '待补充'}`)
      lines.push(`- **T (目标)**：${s.task || '待补充'}`)
      lines.push(`- **A (行动)**：${s.action || '待补充'}`)
      lines.push(`- **R (结果)**：${s.result || '待补充'}`)
      lines.push('')
    })
    const otherSub = starSection.subSections.find(s => s.id === 'other')
    lines.push(otherSub.heading)
    lines.push('')
    lines.push(otherSub.placeholder)
    lines.push('')
  }
  lines.push('---')
  lines.push('')

  const blockersSection = tpl.sections.find(s => s.id === 'blockers')
  lines.push(blockersSection.heading)
  lines.push('')
  lines.push('| ' + blockersSection.columns.join(' | ') + ' |')
  lines.push('|' + blockersSection.columns.map(() => '---').join('|') + '|')
  if (report.issues.length === 0) {
    lines.push('| ' + blockersSection.emptyRow.join(' | ') + ' |')
  } else {
    report.issues.forEach(issue => {
      const parts = typeof issue === 'string' && issue.includes('：') ? issue.split('：') : [issue, '-']
      lines.push(`| ${parts[0]} | - | 未解决 | 待跟进 |`)
    })
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const pdcaSection = tpl.sections.find(s => s.id === 'pdca')
  lines.push(pdcaSection.heading)
  lines.push('')
  const checkSub = pdcaSection.subSections.find(s => s.id === 'check')
  lines.push(checkSub.heading)
  lines.push('')
  lines.push('| ' + checkSub.columns.join(' | ') + ' |')
  lines.push('|' + checkSub.columns.map(() => '---').join('|') + '|')
  checkSub.rows.forEach(row => {
    lines.push('| ' + row.map(cell =>
      cell.replace('{{mainCompleted}}', mainCompleted)
          .replace('{{dailyCount}}', dailyCount)
          .replace('{{deviationAnalysis}}', report.deviationAnalysis || '待补充')
          .replace('{{avgFocusScore}}', report.avgFocusScore || '-')
          .replace('{{resolvedIssues}}', totalIssues > 0 ? '0' : '-')
          .replace('{{totalIssues}}', totalIssues)
    ).join(' | ') + ' |')
  })
  lines.push('')
  const actSub = pdcaSection.subSections.find(s => s.id === 'act')
  lines.push(actSub.heading)
  lines.push('')
  if (report.improvementMeasures) {
    lines.push(`- ${report.improvementMeasures}`)
  } else {
    lines.push('- ' + actSub.emptyItem)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const planSection = tpl.sections.find(s => s.id === 'nextWeekPlan')
  lines.push(planSection.heading)
  lines.push('')
  lines.push('| ' + planSection.columns.join(' | ') + ' |')
  lines.push('|' + planSection.columns.map(() => '---').join('|') + '|')
  if (report.nextWeekPlan.length === 0) {
    lines.push('| ' + planSection.emptyRow.join(' | ') + ' |')
  } else {
    report.nextWeekPlan.forEach((p, i) => lines.push(`| ${i + 1} | ${p} | - | - |`))
  }
  lines.push('')
  if (report.llmContent) {
    const llmSection = tpl.sections.find(s => s.id === 'llmContent')
    lines.push('---')
    lines.push('')
    lines.push(llmSection.heading)
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
  const tpl = loadTemplate('monthly-report')
  const lines = []
  lines.push(tpl.title.replace('{{month}}', report.month))
  lines.push('')
  lines.push(tpl.subtitle.replace('{{month}}', report.month))
  lines.push('')
  lines.push('---')
  lines.push('')

  const overviewSection = tpl.sections.find(s => s.id === 'overview')
  lines.push(overviewSection.heading)
  lines.push('')
  lines.push('| ' + overviewSection.columns.join(' | ') + ' |')
  lines.push('|' + overviewSection.columns.map(() => '---').join('|') + '|')
  const highlightCount = (report.highlights || []).length
  overviewSection.staticRows.forEach(row => {
    lines.push('| ' + row.map(cell => cell.replace('{{highlightCount}}', highlightCount)).join(' | ') + ' |')
  })
  lines.push('')
  lines.push('---')
  lines.push('')

  const iterSection = tpl.sections.find(s => s.id === 'iterationWork')
  if (report.starAchievements && report.starAchievements.length > 0) {
    lines.push(iterSection.heading)
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
  const otherSection = tpl.sections.find(s => s.id === 'otherWork')
  lines.push(otherSection.heading)
  lines.push('')
  lines.push(`### ${otherSection.defaultTitle}`)
  lines.push('**S**：')
  lines.push('**T**：')
  lines.push('**A**：')
  lines.push('**R**：')
  lines.push('')
  lines.push('---')
  lines.push('')

  const statsSection = tpl.sections.find(s => s.id === 'statistics')
  lines.push(statsSection.heading)
  lines.push('')
  lines.push('| ' + statsSection.columns.join(' | ') + ' |')
  lines.push('|' + statsSection.columns.map(() => '---').join('|') + '|')
  statsSection.staticRows.forEach(row => {
    lines.push('| ' + row.join(' | ') + ' |')
  })
  lines.push('')
  lines.push('---')
  lines.push('')

  const pdcaSection = tpl.sections.find(s => s.id === 'pdca')
  lines.push(pdcaSection.heading)
  lines.push('')
  const checkSub = pdcaSection.subSections.find(s => s.id === 'check')
  lines.push(checkSub.heading)
  lines.push('')
  checkSub.items.forEach(item => {
    lines.push(`- **${item.label}**：`)
    if (item.label === '亮点') {
      if (report.highlights.length > 0) {
        report.highlights.forEach(h => lines.push(`  - ${h}`))
      } else {
        lines.push(`  - ${item.emptyItem}`)
      }
    } else {
      lines.push(`  - ${item.emptyItem}`)
    }
  })
  lines.push('')
  const actSub = pdcaSection.subSections.find(s => s.id === 'act')
  lines.push(actSub.heading)
  lines.push('')
  if (report.improvementMeasures) {
    lines.push(`- ${report.improvementMeasures}`)
  } else {
    lines.push('- ' + actSub.emptyItem)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  const planSection = tpl.sections.find(s => s.id === 'nextMonthPlan')
  lines.push(planSection.heading)
  if (report.nextMonthPlan.length === 0) {
    lines.push('- ' + planSection.emptyItem)
  } else {
    report.nextMonthPlan.forEach(p => lines.push(`- ${p}`))
  }
  lines.push('')
  if (report.llmContent) {
    const llmSection = tpl.sections.find(s => s.id === 'llmContent')
    lines.push('---')
    lines.push('')
    lines.push(llmSection.heading)
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
    const result = await callLLM([{ role: 'user', content: loadPrompt('test') }])
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
      inProgress: yesterdayReport.inProgress?.map(t => `${t.title}(${t.progress}%${t.type ? ' ' + t.type : ''})`) || [],
      blockers: yesterdayReport.blockers || [],
      tomorrowPlan: yesterdayReport.tomorrowPlan || [],
    } : null,
    currentTasks: {
      inProgress: inProgress.map(t => `${t.title} [${t.type}] ${t.priority} ${t.progress}% 预估${t.estimatedMinutes}min${t.blocked ? ' 阻塞:' + t.blockedReason : ''}`),
      todo: todo.map(t => `${t.title} [${t.type}] ${t.priority} 预估${t.estimatedMinutes}min`),
      blocked: blocked.map(t => `${t.title} [${t.type}] ${t.priority} ${t.progress}% 阻塞原因:${t.blockedReason}`),
    },
    userInput: req.body.userInput || '',
  }

  const systemPrompt = loadPrompt('morning-plan')

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

  const systemPrompt = loadPrompt('daily-report')

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

  const systemPrompt = loadPrompt('weekly-report')

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

  const systemPrompt = loadPrompt('monthly-report')

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
