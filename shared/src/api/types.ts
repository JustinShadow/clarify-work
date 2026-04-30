import type { Task, DailyReport, WeeklyReport, MonthlyReport, MorningPlan, LLMConfig } from '../types'

export interface TaskAPI {
  list: () => Promise<Task[]>
  create: (task: Partial<Task>) => Promise<Task>
  update: (id: string, task: Partial<Task>) => Promise<Task>
  delete: (id: string) => Promise<{ success: boolean }>
}

export interface TagsAPI {
  list: () => Promise<string[]>
  add: (tags: string[]) => Promise<string[]>
  remove: (name: string) => Promise<string[]>
}

export interface MorningPlanAPI {
  list: () => Promise<MorningPlan[]>
  get: (date: string) => Promise<MorningPlan>
  generate: (data: {
    date?: string
    inbox?: string[]
    nextActions?: Record<string, unknown>[]
    notes?: string
    llmContent?: string
  }) => Promise<MorningPlan>
  update: (date: string, data: Partial<MorningPlan>) => Promise<MorningPlan>
}

export interface DailyReportAPI {
  list: () => Promise<DailyReport[]>
  get: (date: string) => Promise<DailyReport>
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
  }) => Promise<DailyReport>
  delete: (date: string) => Promise<{ success: boolean }>
  update: (date: string, data: Partial<DailyReport>) => Promise<DailyReport>
}

export interface WeeklyReportAPI {
  list: () => Promise<WeeklyReport[]>
  delete: (weekStart: string) => Promise<{ success: boolean }>
  generate: (data: {
    weekStart: string
    weekEnd: string
    summary?: string
    nextWeekPlan?: string[]
    starAchievements?: Record<string, unknown>[]
    deviationAnalysis?: string
    improvementMeasures?: string
    llmContent?: string
  }) => Promise<WeeklyReport>
}

export interface MonthlyReportAPI {
  list: () => Promise<MonthlyReport[]>
  delete: (month: string) => Promise<{ success: boolean }>
  generate: (data: {
    month: string
    summary?: string
    nextMonthPlan?: string[]
    starAchievements?: Record<string, unknown>[]
    deviationAnalysis?: string
    improvementMeasures?: string
    llmContent?: string
  }) => Promise<MonthlyReport>
}

export interface StatsAPI {
  get: () => Promise<{
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
  }>
}

export interface LLMAPI {
  getConfig: () => Promise<LLMConfig>
  updateConfig: (config: Partial<LLMConfig>) => Promise<LLMConfig>
  test: () => Promise<{ success: boolean; message: string }>
  streamGenerate: (
    endpoint: string,
    body: Record<string, any>,
    onChunk: (content: string) => void
  ) => Promise<string>
}

export interface API {
  task: TaskAPI
  tags: TagsAPI
  morningPlan: MorningPlanAPI
  dailyReport: DailyReportAPI
  weeklyReport: WeeklyReportAPI
  monthlyReport: MonthlyReportAPI
  stats: StatsAPI
  llm: LLMAPI
}