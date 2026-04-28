import { useState, useEffect, useCallback } from 'react'
import { morningPlanApi, taskApi, llmApi } from '../api'
import type { MorningPlan, Task, TaskStatus } from '../types'
import { getTodayDateStr } from '../utils/priority'
import { MarkdownContent } from '../utils/markdown'
import Layout from '../components/Layout'
import LLMDialog from '../components/LLMDialog'
import { Sunrise, Sparkles, CheckCircle2, Circle, AlertTriangle, ChevronRight } from 'lucide-react'

export default function MorningPlanPage() {
  const [plans, setPlans] = useState<MorningPlan[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr())
  const [llmOpen, setLlmOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [planData, taskData] = await Promise.all([morningPlanApi.list(), taskApi.list()])
      setPlans(planData)
      setTasks(taskData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const currentPlan = plans.find(p => p.date === selectedDate)
  const today = getTodayDateStr()

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await taskApi.update(taskId, { status })
    fetchData()
  }

  const getTaskById = (title: string) => tasks.find(t => t.title === title)

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
        {/* 页面头部 */}
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
              {plans.length === 0 && <option value={today}>{today}</option>}
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
          <div className="space-y-6">
            {currentPlan.llmContent && <AIPlanContent content={currentPlan.llmContent} />}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <YesterdayLegacySection plan={currentPlan} />
              <InboxSection plan={currentPlan} />
              {currentPlan.notes && <NotesSection notes={currentPlan.notes} />}
            </div>
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
          } catch (err) {
            console.error(err)
          }
          fetchData()
        }}
        onClose={() => setLlmOpen(false)}
        streamFn={(body, onChunk) => llmApi.streamGenerate('/llm/generate-morning-plan', body, onChunk)}
        streamBody={{ date: selectedDate }}
      />
    </Layout>
  )
}

function AIPlanContent({ content }: { content: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="px-6 py-5">
        <MarkdownContent content={content} theme="blue" />
      </div>
    </div>
  )
}

function YesterdayLegacySection({ plan }: { plan: MorningPlan }) {
  const hasContent = plan.yesterdayCompleted.length > 0
    || plan.yesterdayUnfinished.length > 0
    || plan.yesterdayBlockers.length > 0
    || plan.yesterdayTomorrowPlan.length > 0

  if (!hasContent) return null

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm">
      <div className="p-4 border-b border-[#f1f5f9]">
        <h2 className="text-sm font-bold text-[#475569]">📌 昨日遗留</h2>
      </div>
      <div className="p-4 space-y-4">
        {plan.yesterdayUnfinished.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#64748b] mb-2">⏳ 未完成 → 今日待续</p>
            {plan.yesterdayUnfinished.map((t, i) => (
              <div key={i} className="flex items-center gap-2 ml-2 py-1">
                <Circle size={10} className="text-[#cbd5e1]" />
                <span className="text-xs text-[#64748b]">{t.title}</span>
                <span className="text-[10px] text-[#94a3b8]">{t.progress}%</span>
              </div>
            ))}
          </div>
        )}
        {plan.yesterdayTomorrowPlan.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#64748b] mb-2">💡 昨日计划 → 今日继承</p>
            {plan.yesterdayTomorrowPlan.map((p, i) => (
              <div key={i} className="flex items-center gap-2 ml-2 py-1">
                <ChevronRight size={10} className="text-[#3b82f6]" />
                <span className="text-xs text-[#64748b]">{p}</span>
              </div>
            ))}
          </div>
        )}
        {plan.yesterdayBlockers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#f97316] mb-2">🔄 阻塞 → 今日跟进</p>
            {plan.yesterdayBlockers.map((b, i) => (
              <div key={i} className="flex items-center gap-2 ml-2 py-1">
                <AlertTriangle size={10} className="text-[#f97316]" />
                <span className="text-xs text-[#64748b]">{b}</span>
              </div>
            ))}
          </div>
        )}
        {plan.yesterdayCompleted.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#10b981] mb-2">✅ 昨日已完成</p>
            {plan.yesterdayCompleted.map((t, i) => (
              <div key={i} className="flex items-center gap-2 ml-2 py-1">
                <CheckCircle2 size={10} className="text-[#10b981]" />
                <span className="text-xs text-[#94a3b8] line-through">{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InboxSection({ plan }: { plan: MorningPlan }) {
  if (!plan.inbox || plan.inbox.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm">
      <div className="p-4 border-b border-[#f1f5f9]">
        <h2 className="text-sm font-bold text-[#475569]">📥 Inbox - 今日新增</h2>
      </div>
      <div className="p-4">
        {plan.inbox.map((t, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <span className="text-xs text-[#94a3b8]">{i + 1}.</span>
            <span className="text-xs text-[#64748b]">{typeof t === 'string' ? t : t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotesSection({ notes }: { notes: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm">
      <div className="p-4 border-b border-[#f1f5f9]">
        <h2 className="text-sm font-bold text-[#475569]">📝 注意事项</h2>
      </div>
      <div className="p-4">
        <p className="text-xs text-[#64748b] whitespace-pre-wrap">{notes}</p>
      </div>
    </div>
  )
}
