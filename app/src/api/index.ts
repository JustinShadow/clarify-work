import type { Task, DailyReport, WeeklyReport, MonthlyReport } from '../types'

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

export const dailyReportApi = {
  list: () => request<DailyReport[]>('/reports/daily'),
  get: (date: string) => request<DailyReport>(`/reports/daily/${date}`),
  generate: (data: { date?: string; tomorrowPlan?: string[]; blockers?: string[]; notes?: string }) =>
    request<DailyReport>('/reports/daily/generate', { method: 'POST', body: JSON.stringify(data) }),
  update: (date: string, data: Partial<DailyReport>) =>
    request<DailyReport>(`/reports/daily/${date}`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const weeklyReportApi = {
  list: () => request<WeeklyReport[]>('/reports/weekly'),
  generate: (data: { weekStart: string; weekEnd: string; summary?: string; nextWeekPlan?: string[] }) =>
    request<WeeklyReport>('/reports/weekly/generate', { method: 'POST', body: JSON.stringify(data) }),
}

export const monthlyReportApi = {
  list: () => request<MonthlyReport[]>('/reports/monthly'),
  generate: (data: { month: string; summary?: string; nextMonthPlan?: string[] }) =>
    request<MonthlyReport>('/reports/monthly/generate', { method: 'POST', body: JSON.stringify(data) }),
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
