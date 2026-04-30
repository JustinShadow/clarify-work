import type { API } from './types'

const isTauri = typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)

let apiInstance: API | null = null

export async function initAPI(): Promise<API> {
  if (apiInstance) return apiInstance

  if (isTauri) {
    const { api } = await import('./tauri-adapter')
    apiInstance = api
  } else {
    const { api } = await import('./web-adapter')
    apiInstance = api
  }

  return apiInstance
}

export function getAPI(): API {
  if (!apiInstance) {
    throw new Error('API not initialized. Call initAPI() first.')
  }
  return apiInstance
}

function createNamespaceProxy<K extends keyof API>(key: K): API[K] {
  return new Proxy({} as API[K], {
    get(_target, prop) {
      if (!apiInstance) {
        throw new Error(`API not initialized. Call initAPI() before using ${String(prop)} on ${key}`)
      }
      return (apiInstance[key] as any)[prop]
    },
  }) as API[K]
}

export const taskApi = createNamespaceProxy('task')
export const tagsApi = createNamespaceProxy('tags')
export const morningPlanApi = createNamespaceProxy('morningPlan')
export const dailyReportApi = createNamespaceProxy('dailyReport')
export const weeklyReportApi = createNamespaceProxy('weeklyReport')
export const monthlyReportApi = createNamespaceProxy('monthlyReport')
export const statsApi = createNamespaceProxy('stats')
export const llmApi = createNamespaceProxy('llm')

export const api: API = new Proxy({} as API, {
  get(_target, prop) {
    if (!apiInstance) {
      throw new Error(
        `API not initialized. Import initAPI and call it before using api.${String(prop)}`
      )
    }
    return (apiInstance as any)[prop]
  },
})

export type * from './types'