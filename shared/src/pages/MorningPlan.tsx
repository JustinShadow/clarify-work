import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { morningPlanApi, llmApi } from '../api'
import type { MorningPlan } from '../types'
import { getTodayDateStr } from '../utils/priority'
import { MarkdownContent } from '../utils/markdown'
import Layout from '../components/Layout'
import LLMDialog from '../components/LLMDialog'
import { Sunrise, Sparkles, FileText, AlertTriangle } from 'lucide-react'

function buildSummary(plan: MorningPlan): string {
  const inProgress = plan.nextActions.filter(t => t.status === 'in_progress')
  const todo = plan.nextActions.filter(t => t.status === 'todo')
  const blocked = plan.nextActions.filter(t => t.blocked)
  const parts: string[] = []
  if (inProgress.length > 0) {
    parts.push(`${inProgress.length}项进行中${blocked.length > 0 ? `(含${blocked.length}项阻塞)` : ''}`)
  }
  if (todo.length > 0) {
    parts.push(`${todo.length}项待办`)
  }
  if (plan.inbox.length > 0) {
    parts.push(`${plan.inbox.length}项新增`)
  } else {
    parts.push('今日无新增')
  }
  return parts.join('，')
}

function ContextBanner({ mode, sourceDate, stalenessDays }: {
  mode: string
  sourceDate?: string
  stalenessDays?: number
}) {
  if (mode === 'tasks-only' || mode === 'daily') return null

  const isStale = (stalenessDays ?? 0) > 7

  const config = {
    weekly: {
      Icon: FileText,
      bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]', text: 'text-[#1e40af]',
      label: '基于上周周报生成',
    },
    'fallback-daily': {
      Icon: AlertTriangle,
      bg: isStale ? 'bg-[#fee2e2]' : 'bg-[#ffedd5]',
      border: isStale ? 'border-[#fca5a5]' : 'border-[#fdba74]',
      text: isStale ? 'text-[#991b1b]' : 'text-[#c2410c]',
      label: `基于 ${sourceDate} 日报生成（距今${stalenessDays}天，请核实任务状态）`,
    },
    'fallback-weekly': {
      Icon: AlertTriangle,
      bg: isStale ? 'bg-[#fee2e2]' : 'bg-[#ffedd5]',
      border: isStale ? 'border-[#fca5a5]' : 'border-[#fdba74]',
      text: isStale ? 'text-[#991b1b]' : 'text-[#c2410c]',
      label: `基于 ${sourceDate} 周报生成（距今${stalenessDays}天，请核实任务状态）`,
    },
  }[mode]

  if (!config) return null

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl px-4 py-2.5 text-sm ${config.text} flex items-center gap-2`}>
      <config.Icon size={14} />
      <span>{config.label}</span>
    </div>
  )
}

export default function MorningPlanPage() {
  const [plans, setPlans] = useState<MorningPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr())
  const [llmOpen, setLlmOpen] = useState(false)

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const planData = await morningPlanApi.list()
      if (signal?.aborted) return
      setPlans(planData)
    } catch (err) {
      if (signal?.aborted) return
      console.error(err)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    fetchData(ac.signal)
    return () => ac.abort()
  }, [fetchData])

  const currentPlan = plans.find(p => p.date === selectedDate)
  const today = getTodayDateStr()

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20 text-[#94a3b8]">加载中...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#fef3c7] rounded-xl flex items-center justify-center">
              <Sunrise size={24} className="text-[#f59e0b]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1e3a5f]">晨间规划</h1>
              <p className="text-sm text-[#64748b]">GTD 任务流 · 按规划执行</p>
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none bg-[#f8fafc]"
            >
              {!plans.some(p => p.date === today) && <option value={today}>{today} (今日)</option>}
              {plans.map(p => (
                <option key={p.date} value={p.date}>
                  {p.date}{p.date === today ? ' (今日)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => setLlmOpen(true)}
              className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#1e4976] transition text-sm font-semibold flex items-center gap-2 shadow-md"
            >
              <Sparkles size={16} /> AI 生成规划
            </button>
          </div>
        </div>

        {!currentPlan ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Sunrise size={32} className="text-[#cbd5e1]" />
            </div>
            <p className="text-[#64748b] mb-2">{selectedDate === today ? '今日尚未生成晨间规划' : `${selectedDate} 无规划记录`}</p>
            <p className="text-sm text-[#94a3b8]">点击"AI 生成规划"开始今日规划</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-[#64748b]">
              <span>{buildSummary(currentPlan)}</span>
              <span className="text-[#cbd5e1]">|</span>
              <Link to="/" className="text-xs text-[#3b82f6] hover:underline">查看看板</Link>
            </div>
            {currentPlan.llmContent && (
              <div className="space-y-4">
                {currentPlan.contextMode && currentPlan.contextMode !== 'daily' && (
                  <ContextBanner
                    mode={currentPlan.contextMode}
                    sourceDate={currentPlan.contextSourceDate}
                    stalenessDays={currentPlan.contextStalenessDays}
                  />
                )}
                <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-[#eff6ff] border-b border-[#bfdbfe] flex items-center gap-2">
                    <Sparkles size={14} className="text-[#3b82f6]" />
                    <span className="text-sm font-semibold text-[#1e40af]">AI 规划建议</span>
                  </div>
                  <div className="px-6 py-5">
                    <MarkdownContent content={currentPlan.llmContent} theme="blue" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <LLMDialog
        open={llmOpen}
        title="AI 生成晨间规划"
        systemContext=""
        onGenerate={async (content) => {
          try {
            await morningPlanApi.generate({ date: selectedDate, llmContent: content })
            await fetchData()
            setLlmOpen(false)
          } catch (err) {
            console.error('生成规划失败:', err)
            alert('生成规划失败，请查看控制台错误信息')
          }
        }}
        onClose={() => setLlmOpen(false)}
        streamFn={(body, onChunk) => llmApi.streamGenerate('/llm/generate-morning-plan', body, onChunk)}
        streamBody={{ date: selectedDate }}
      />
    </Layout>
  )
}