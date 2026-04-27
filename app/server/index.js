const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ charset: 'utf-8' }))
app.use((req, res, next) => {
  res.charset = 'utf-8'
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  next()
})

const DATA_DIR = path.join(__dirname, 'data')
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json')
const TAGS_FILE = path.join(DATA_DIR, 'tags.json')
const REPORTS_DIR = path.join(DATA_DIR, 'reports')

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
  if (newTags.length > 0) {
    writeTags([...existing, ...newTags])
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

// ========== Task APIs ==========

app.get('/api/tasks', (req, res) => {
  const tasks = readTasks()
  res.json(tasks)
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
  tasks[idx] = {
    ...tasks[idx],
    ...req.body,
    id: tasks[idx].id,
    createdAt: tasks[idx].createdAt,
    updatedAt: now,
    completedAt: req.body.status === 'done' && !tasks[idx].completedAt ? now : tasks[idx].completedAt,
  }
  if (req.body.status === 'done') {
    tasks[idx].progress = 100
    tasks[idx].blocked = false
    tasks[idx].blockedReason = ''
  }
  if (req.body.status && req.body.status !== 'done') {
    tasks[idx].completedAt = null
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
  const autoBlockers = blockedTasks
    .filter(t => t.blockedReason)
    .map(t => `${t.title}：${t.blockedReason}`)

  const report = {
    date,
    completedMain,
    completedSide,
    inProgress,
    todo,
    tomorrowPlan: req.body.tomorrowPlan || [],
    blockers: [...autoBlockers, ...(req.body.blockers || [])],
    notes: req.body.notes || '',
    createdAt: now,
    updatedAt: now,
  }

  const dir = path.join(REPORTS_DIR, 'daily')
  ensureDir(dir)
  const filePath = path.join(dir, `${date}.json`)
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8')

  // Also save as markdown
  const md = generateDailyMarkdown(report)
  const mdDir = path.join(process.cwd(), 'reports', 'daily')
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${date}.md`), md, 'utf-8')

  res.json(report)
})

app.put('/api/reports/daily/:date', (req, res) => {
  const filePath = path.join(REPORTS_DIR, 'daily', `${req.params.date}.json`)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report not found' })
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const now = new Date().toISOString()
  const updated = { ...existing, ...req.body, date: req.params.date, updatedAt: now }
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8')

  const md = generateDailyMarkdown(updated)
  const mdDir = path.join(process.cwd(), 'reports', 'daily')
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${req.params.date}.md`), md, 'utf-8')

  res.json(updated)
})

function generateDailyMarkdown(report) {
  const lines = []
  lines.push(`# 日报 - ${report.date}`)
  lines.push('')
  lines.push('## 一、今日完成（主线）')
  if (report.completedMain.length === 0) {
    lines.push('- 无')
  } else {
    report.completedMain.forEach(t => {
      lines.push(`- [x] ${t.title} (${t.estimatedMinutes}min)`)
    })
  }
  lines.push('')
  lines.push('## 二、今日完成（支线）')
  if (report.completedSide.length === 0) {
    lines.push('- 无')
  } else {
    report.completedSide.forEach(t => {
      lines.push(`- [x] ${t.title} (${t.estimatedMinutes}min)`)
    })
  }
  lines.push('')
  lines.push('## 三、进行中')
  if (report.inProgress.length === 0) {
    lines.push('- 无')
  } else {
    report.inProgress.forEach(t => {
      const blockedTag = t.blocked ? ' 🚫阻塞' : ''
      const progressTag = t.progress ? ` (${t.progress}%)` : ''
      lines.push(`- [ ] ${t.title} [${t.type === 'main' ? '主线' : '支线'}]${blockedTag}${progressTag}`)
    })
  }
  lines.push('')
  lines.push('## 四、待办')
  if (report.todo.length === 0) {
    lines.push('- 无')
  } else {
    report.todo.forEach(t => {
      lines.push(`- [ ] ${t.title} [${t.type === 'main' ? '主线' : '支线'}] (${t.estimatedMinutes}min)`)
    })
  }
  lines.push('')
  lines.push('## 五、明日计划')
  if (report.tomorrowPlan.length === 0) {
    lines.push('- 待规划')
  } else {
    report.tomorrowPlan.forEach(p => lines.push(`- ${p}`))
  }
  lines.push('')
  lines.push('## 六、风险/阻塞')
  if (report.blockers.length === 0) {
    lines.push('- 无')
  } else {
    report.blockers.forEach(b => lines.push(`- ${b}`))
  }
  if (report.notes) {
    lines.push('')
    lines.push('## 补充说明')
    lines.push(report.notes)
  }
  lines.push('')
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

app.get('/api/reports/weekly/:weekStart', (req, res) => {
  const filePath = path.join(REPORTS_DIR, 'weekly', `${req.params.weekStart}.json`)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report not found' })
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')))
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
    if (report.date >= weekStart && report.date <= weekEnd) {
      dailyReports.push(report)
    }
  })

  const allCompletedMain = dailyReports.flatMap(r => r.completedMain || [])
  const allCompletedSide = dailyReports.flatMap(r => r.completedSide || [])
  const allBlockers = dailyReports.flatMap(r => r.blockers || [])

  const report = {
    weekStart,
    weekEnd,
    dailyReports,
    summary: req.body.summary || '',
    highlights: allCompletedMain.map(t => t.title),
    issues: allBlockers,
    nextWeekPlan: req.body.nextWeekPlan || [],
    createdAt: now,
    updatedAt: now,
  }

  const dir = path.join(REPORTS_DIR, 'weekly')
  ensureDir(dir)
  fs.writeFileSync(path.join(dir, `${weekStart}.json`), JSON.stringify(report, null, 2), 'utf-8')

  const md = generateWeeklyMarkdown(report)
  const mdDir = path.join(process.cwd(), 'reports', 'weekly')
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${weekStart}.md`), md, 'utf-8')

  res.json(report)
})

function generateWeeklyMarkdown(report) {
  const lines = []
  lines.push(`# 周报 - ${report.weekStart} ~ ${report.weekEnd}`)
  lines.push('')
  if (report.summary) {
    lines.push('## 概要')
    lines.push(report.summary)
    lines.push('')
  }
  lines.push('## 本周亮点')
  if (report.highlights.length === 0) {
    lines.push('- 无')
  } else {
    const unique = [...new Set(report.highlights)]
    unique.forEach(h => lines.push(`- ${h}`))
  }
  lines.push('')
  lines.push('## 问题与风险')
  if (report.issues.length === 0) {
    lines.push('- 无')
  } else {
    const unique = [...new Set(report.issues)]
    unique.forEach(i => lines.push(`- ${i}`))
  }
  lines.push('')
  lines.push('## 下周计划')
  if (report.nextWeekPlan.length === 0) {
    lines.push('- 待规划')
  } else {
    report.nextWeekPlan.forEach(p => lines.push(`- ${p}`))
  }
  lines.push('')

  if (report.dailyReports && report.dailyReports.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## 每日详情')
    report.dailyReports.forEach(dr => {
      lines.push(`### ${dr.date}`)
      const completed = [...(dr.completedMain || []), ...(dr.completedSide || [])]
      if (completed.length > 0) {
        completed.forEach(t => lines.push(`- [x] ${t.title}`))
      }
      const ip = dr.inProgress || []
      if (ip.length > 0) {
        ip.forEach(t => lines.push(`- [ ] ${t.title} (进行中)`))
      }
      lines.push('')
    })
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
    if (report.weekStart.startsWith(month)) {
      weeklyReports.push(report)
    }
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
    createdAt: now,
    updatedAt: now,
  }

  const dir = path.join(REPORTS_DIR, 'monthly')
  ensureDir(dir)
  fs.writeFileSync(path.join(dir, `${month}.json`), JSON.stringify(report, null, 2), 'utf-8')

  const md = generateMonthlyMarkdown(report)
  const mdDir = path.join(process.cwd(), 'reports', 'monthly')
  ensureDir(mdDir)
  fs.writeFileSync(path.join(mdDir, `${month}.md`), md, 'utf-8')

  res.json(report)
})

function generateMonthlyMarkdown(report) {
  const lines = []
  lines.push(`# 月报 - ${report.month}`)
  lines.push('')
  if (report.summary) {
    lines.push('## 概要')
    lines.push(report.summary)
    lines.push('')
  }
  lines.push('## 本月亮点')
  if (report.highlights.length === 0) {
    lines.push('- 无')
  } else {
    report.highlights.forEach(h => lines.push(`- ${h}`))
  }
  lines.push('')
  lines.push('## 问题与风险')
  if (report.issues.length === 0) {
    lines.push('- 无')
  } else {
    report.issues.forEach(i => lines.push(`- ${i}`))
  }
  lines.push('')
  lines.push('## 下月计划')
  if (report.nextMonthPlan.length === 0) {
    lines.push('- 待规划')
  } else {
    report.nextMonthPlan.forEach(p => lines.push(`- ${p}`))
  }
  lines.push('')

  if (report.weeklyReports && report.weeklyReports.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## 周报详情')
    report.weeklyReports.forEach(wr => {
      lines.push(`### ${wr.weekStart} ~ ${wr.weekEnd}`)
      if (wr.highlights && wr.highlights.length > 0) {
        wr.highlights.forEach(h => lines.push(`- ${h}`))
      }
      lines.push('')
    })
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
