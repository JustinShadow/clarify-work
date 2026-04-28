import type { Task, DailyReport, WeeklyReport, MonthlyReport, MorningPlan, LLMConfig } from '../types'

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const taskApi = {
  list: () => request<Task[]>('/tasks'),
  create: (task: Partial<Task>) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  update: (id: string, task: Partial<Task>) => request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
  delete: (id: string) => request<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
}

export const tagsApi = {
  list: () => request<string[]>('/tags'),
  add: (tags: string[]) => request<string[]>('/tags', { method: 'POST', body: JSON.stringify({ tags }) }),
  remove: (name: string) => request<string[]>(`/tags/${encodeURIComponent(name)}`, { method: 'DELETE' }),
}

export const morningPlanApi = {
  list: () => request<MorningPlan[]>('/reports/morning-plan'),
  get: (date: string) => request<MorningPlan>(`/reports/morning-plan/${date}`),
  generate: (data: { date?: string; inbox?: string[]; nextActions?: Record<string, unknown>[]; notes?: string; llmContent?: string }) =>
    request<MorningPlan>('/reports/morning-plan/generate', { method: 'POST', body: JSON.stringify(data) }),
  update: (date: string, data: Partial<MorningPlan>) =>
    request<MorningPlan>(`/reports/morning-plan/${date}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const dailyReportApi = {
  list: () => request<DailyReport[]>('/reports/daily'),
  get: (date: string) => request<DailyReport>(`/reports/daily/${date}`),
  generate: (data: {
    date?: string
    tomorrowPlan?: string[]
    blockers?: string[]
    notes?: string
    focusScore?: number
    planCompletionRate?: number
    actualCompletionRate?: number
    deviationAnalysis?: string
    improvementMeasures?: string
    llmContent?: string
  }) => request<DailyReport>('/reports/daily/generate', { method: 'POST', body: JSON.stringify(data) }),
  update: (date: string, data: Partial<DailyReport>) =>
    request<DailyReport>(`/reports/daily/${date}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const weeklyReportApi = {
  list: () => request<WeeklyReport[]>('/reports/weekly'),
  generate: (data: {
    weekStart: string
    weekEnd: string
    summary?: string
    nextWeekPlan?: string[]
    starAchievements?: Record<string, unknown>[]
    deviationAnalysis?: string
    improvementMeasures?: string
    llmContent?: string
  }) => request<WeeklyReport>('/reports/weekly/generate', { method: 'POST', body: JSON.stringify(data) }),
}

export const monthlyReportApi = {
  list: () => request<MonthlyReport[]>('/reports/monthly'),
  generate: (data: {
    month: string
    summary?: string
    nextMonthPlan?: string[]
    starAchievements?: Record<string, unknown>[]
    deviationAnalysis?: string
    improvementMeasures?: string
    llmContent?: string
  }) => request<MonthlyReport>('/reports/monthly/generate', { method: 'POST', body: JSON.stringify(data) }),
}

export const statsApi = {
  get: () => request<{
    total: number
    todo: number
    inProgress: number
    blocked: number
    done: number
    totalEstimatedMinutes: number
    completedToday: number
    overdueCount: number
    overdueTasks: Task[]
    mainCount: number
    sideCount: number
  }>('/stats'),
}

export const llmApi = {
  getConfig: () => request<LLMConfig>('/llm/config'),
  updateConfig: (config: Partial<LLMConfig>) => request<LLMConfig>('/llm/config', { method: 'PUT', body: JSON.stringify(config) }),
  test: () => request<{ success: boolean; message: string }>('/llm/test', { method: 'POST' }),
  streamGenerate: (endpoint: string, body: Record<string, any>, onChunk: (content: string) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      let fullContent = ''
      fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(response => {
        if (!response.ok) {
          response.json().then(err => reject(new Error(err.error || 'Request failed'))).catch(() => reject(new Error('Request failed')))
          return
        }
        const reader = response.body?.getReader()
        if (!reader) { reject(new Error('No reader')); return }
        const decoder = new TextDecoder()
        function read() {
          reader.read().then(({ done, value }) => {
            if (done) { resolve(fullContent); return }
            const text = decoder.decode(value, { stream: true })
            const lines = text.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.error) { reject(new Error(data.error)); return }
                  if (data.done) { resolve(fullContent); return }
                  if (data.content) {
                    fullContent += data.content
                    onChunk(fullContent)
                  }
                } catch { /* skip invalid SSE lines */ }
              }
            }
            read()
          }).catch(reject)
        }
        read()
      }).catch(reject)
    })
  },
}
