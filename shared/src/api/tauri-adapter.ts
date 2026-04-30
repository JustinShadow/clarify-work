import { invoke, Channel } from '@tauri-apps/api/core'
import type {
  TaskAPI,
  TagsAPI,
  MorningPlanAPI,
  DailyReportAPI,
  WeeklyReportAPI,
  MonthlyReportAPI,
  StatsAPI,
  LLMAPI,
} from './types'
import type {
  Task,
  DailyReport,
  WeeklyReport,
  MonthlyReport,
  MorningPlan,
  LLMConfig,
} from '../types'

const taskApi: TaskAPI = {
  list: () => invoke<Task[]>('list_tasks'),
  create: (task: Partial<Task>) => invoke<Task>('create_task', { task }),
  update: (id: string, task: Partial<Task>) => invoke<Task>('update_task', { id, task }),
  delete: (id: string) => invoke<{ success: boolean }>('delete_task', { id }),
}

const tagsApi: TagsAPI = {
  list: () => invoke<string[]>('list_tags'),
  add: (tags: string[]) => invoke<string[]>('add_tags', { tags }),
  remove: (name: string) => invoke<string[]>('remove_tag', { name }),
}

const morningPlanApi: MorningPlanAPI = {
  list: () => invoke<MorningPlan[]>('list_morning_plans'),
  get: (date: string) => invoke<MorningPlan>('get_morning_plan', { date }),
  generate: (data) => invoke<MorningPlan>('generate_morning_plan', { input: data }),
  update: (date: string, data: Partial<MorningPlan>) =>
    invoke<MorningPlan>('update_morning_plan', { date, data }),
}

const dailyReportApi: DailyReportAPI = {
  list: () => invoke<DailyReport[]>('list_daily_reports'),
  get: (date: string) => invoke<DailyReport>('get_daily_report', { date }),
  generate: (data) => invoke<DailyReport>('generate_daily_report', { input: data }),
  delete: (date: string) => invoke<{ success: boolean }>('delete_daily_report', { date }),
  update: (date: string, data: Partial<DailyReport>) =>
    invoke<DailyReport>('update_daily_report', { date, data }),
}

const weeklyReportApi: WeeklyReportAPI = {
  list: () => invoke<WeeklyReport[]>('list_weekly_reports'),
  delete: (weekStart: string) =>
    invoke<{ success: boolean }>('delete_weekly_report', { weekStart }),
  generate: (data) => invoke<WeeklyReport>('generate_weekly_report', { input: data }),
}

const monthlyReportApi: MonthlyReportAPI = {
  list: () => invoke<MonthlyReport[]>('list_monthly_reports'),
  delete: (month: string) =>
    invoke<{ success: boolean }>('delete_monthly_report', { month }),
  generate: (data) => invoke<MonthlyReport>('generate_monthly_report', { input: data }),
}

const statsApi: StatsAPI = {
  get: () =>
    invoke<{
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

interface StreamEvent {
  content?: string
  done?: boolean
  error?: string
}

const llmApi: LLMAPI = {
  getConfig: () => invoke<LLMConfig>('get_llm_config'),
  updateConfig: (config: Partial<LLMConfig>) =>
    invoke<LLMConfig>('update_llm_config', { config }),
  test: () => invoke<{ success: boolean; message: string }>('test_llm'),

  streamGenerate: (endpoint: string, body: Record<string, any>, onChunk: (content: string) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      let fullContent = ''

      const channel = new Channel<StreamEvent>()

      channel.onmessage = (event) => {
        if (event.error) {
          reject(new Error(event.error))
          return
        }
        if (event.done) {
          resolve(fullContent)
          return
        }
        if (event.content) {
          fullContent = event.content
          onChunk(fullContent)
        }
      }

      invoke('llm_stream_generate', { endpoint, body, onEvent: channel }).catch(reject)
    })
  },
}

export const api = {
  task: taskApi,
  tags: tagsApi,
  morningPlan: morningPlanApi,
  dailyReport: dailyReportApi,
  weeklyReport: weeklyReportApi,
  monthlyReport: monthlyReportApi,
  stats: statsApi,
  llm: llmApi,
}

export {
  taskApi,
  tagsApi,
  morningPlanApi,
  dailyReportApi,
  weeklyReportApi,
  monthlyReportApi,
  statsApi,
  llmApi,
}