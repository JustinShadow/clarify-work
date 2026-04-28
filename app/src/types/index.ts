export type TaskType = 'main' | 'side'
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: string
  title: string
  description: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  progress: number
  blocked: boolean
  blockedReason: string
  estimatedMinutes: number
  deadline: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  tags: string[]
}

export interface MorningPlan {
  date: string
  yesterdayCompleted: string[]
  yesterdayUnfinished: { title: string; type: TaskType; progress: number }[]
  yesterdayBlockers: string[]
  yesterdayTomorrowPlan: string[]
  inbox: string[]
  nextActions: {
    title: string
    type: TaskType
    priority: TaskPriority
    estimatedMinutes: number
    status: TaskStatus
    progress: number
    blocked: boolean
    blockedReason: string
  }[]
  waiting: { title: string; reason: string }[]
  notes: string
  llmContent: string
  createdAt: string
  updatedAt: string
}

export interface DailyReport {
  date: string
  inbox: string[]
  completedMain: Task[]
  completedSide: Task[]
  inProgress: Task[]
  todo: Task[]
  tomorrowPlan: string[]
  blockers: string[]
  notes: string
  focusScore: number | null
  planCompletionRate: number | null
  actualCompletionRate: number | null
  deviationAnalysis: string
  improvementMeasures: string
  morningPlan: MorningPlan | null
  llmContent: string
  createdAt: string
  updatedAt: string
}

export interface StarAchievement {
  title: string
  situation: string
  task: string
  action: string
  result: string
}

export interface WeeklyReport {
  weekStart: string
  weekEnd: string
  dailyReports: DailyReport[]
  summary: string
  highlights: string[]
  issues: string[]
  nextWeekPlan: string[]
  avgFocusScore: string | null
  deviationAnalysis: string
  improvementMeasures: string
  starAchievements: StarAchievement[]
  llmContent: string
  createdAt: string
  updatedAt: string
}

export interface MonthlyReport {
  month: string
  weeklyReports: WeeklyReport[]
  summary: string
  highlights: string[]
  issues: string[]
  nextMonthPlan: string[]
  starAchievements: StarAchievement[]
  deviationAnalysis: string
  improvementMeasures: string
  llmContent: string
  createdAt: string
  updatedAt: string
}

export interface LLMConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P0: '紧急',
  P1: '重要',
  P2: '一般',
  P3: '可选',
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  P0: 'bg-red-100 text-red-700 border-red-300',
  P1: 'bg-orange-100 text-orange-700 border-orange-300',
  P2: 'bg-blue-100 text-blue-700 border-blue-300',
  P3: 'bg-gray-100 text-gray-600 border-gray-300',
}

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  P0: 'bg-red-500',
  P1: 'bg-orange-500',
  P2: 'bg-blue-500',
  P3: 'bg-slate-400',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
}

export const TYPE_LABELS: Record<TaskType, string> = {
  main: '主线',
  side: '支线',
}
