import { invoke } from '@tauri-apps/api/core'
import type { Task, DailyReport, WeeklyReport, MonthlyReport } from '../types'

export const taskApi = {
  list: () => invoke<Task[]>('list_tasks'),
  create: (task: Partial<Task>) => invoke<Task>('create_task', { task }),
  update: (id: string, task: Partial<Task>) => invoke<Task>('update_task', { id, task }),
  delete: (id: string) => invoke<boolean>('delete_task', { id }),
}

export const tagsApi = {
  list: () => invoke<string[]>('list_tags'),
  add: (tags: string[]) => invoke<string[]>('add_tags', { tags }),
  remove: (name: string) => invoke<string[]>('remove_tag', { name }),
}

export const dailyReportApi = {
  list: () => invoke<DailyReport[]>('list_daily_reports'),
  get: (date: string) => invoke<DailyReport>('get_daily_report', { date }),
  generate: (data: { date?: string; tomorrowPlan?: string[]; blockers?: string[]; notes?: string }) =>
    invoke<DailyReport>('generate_daily_report', { input: data }),
  update: (date: string, data: Partial<DailyReport>) =>
    invoke<DailyReport>('update_daily_report', { date, data }),
}

export const weeklyReportApi = {
  list: () => invoke<WeeklyReport[]>('list_weekly_reports'),
  generate: (data: { weekStart: string; weekEnd: string; summary?: string; nextWeekPlan?: string[] }) =>
    invoke<WeeklyReport>('generate_weekly_report', { input: data }),
}

export const monthlyReportApi = {
  list: () => invoke<MonthlyReport[]>('list_monthly_reports'),
  generate: (data: { month: string; summary?: string; nextMonthPlan?: string[] }) =>
    invoke<MonthlyReport>('generate_monthly_report', { input: data }),
}

export const statsApi = {
  get: () => invoke<{
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
  }>('get_stats'),
}
