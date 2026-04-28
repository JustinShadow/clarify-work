import { useState, useEffect, useCallback } from 'react'
import { morningPlanApi, taskApi, llmApi } from '../api'
import type { MorningPlan, Task, TaskStatus } from '../types'
import { PRIORITY_LABELS, PRIORITY_DOT, STATUS_LABELS } from '../types'
import { getTodayDateStr } from '../utils/priority'
import Layout from '../components/Layout'
import LLMDialog from '../components/LLMDialog'
import { Sunrise, Sparkles, CheckCircle2, Circle, Clock, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react'

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
        <div className="text-center py-20 text-slate-400">加载中...</div>
      </Layout>
    )
  }

  const hasTodayPlan = plans.some(p => p.date === today)

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Sunrise size={24} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">晨间规划</h1>
              <p className="text-sm text-slate-500">GTD 任务流 · 按规划执行</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium flex items-center gap-1"
            >
              <Sparkles size={14} /> AI 生成规划
            </button>
          </div>
        </div>

        {!currentPlan ? (
          <div className="text-center py-20">
            <Sunrise size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-400 mb-2">{selectedDate === today ? '今日尚未生成晨间规划' : `${selectedDate} 无规划记录`}</p>
            <p className="text-sm text-slate-300">点击"AI 生成规划"开始今日规划</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <NextActionsSection plan={currentPlan} tasks={tasks} onStatusChange={handleStatusChange} getTaskById={getTaskById} />
              <WaitingSection plan={currentPlan} />
              {currentPlan.llmContent && <AIContentSection content={currentPlan.llmContent} />}
            </div>
            <div className="space-y-5">
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
          setLlmOpen(false)
          fetchData()
        }}
        onClose={() => setLlmOpen(false)}
        streamFn={(body, onChunk) => llmApi.streamGenerate('/llm/generate-morning-plan', body, onChunk)}
        streamBody={{ date: selectedDate }}
      />
    </Layout>
  )
}

function NextActionsSection({ plan, tasks, onStatusChange, getTaskById }: {
  plan: MorningPlan
  tasks: Task[]
  onStatusChange: (id: string, status: TaskStatus) => void
  getTaskById: (title: string) => Task | undefined
}) {
  const totalMinutes = plan.nextActions.reduce((sum, a) => sum + (a.estimatedMinutes || 0), 0)
  const completedCount = plan.nextActions.filter(a => {
    const task = getTaskById(a.title)
    return task?.status === 'done'
  }).length
  const totalCount = plan.nextActions.length

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ChevronRight size={18} className="text-purple-500" /> 🎯 Next Actions - 今日执行
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{completedCount}/{totalCount} 完成</span>
            <span>{Math.round(totalMinutes / 60 * 10) / 10}h 预计</span>
          </div>
        </div>
        {totalCount > 0 && (
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>
      <div className="divide-y divide-slate-50">
        {plan.nextActions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">暂无执行安排</div>
        ) : (
          plan.nextActions.map((action, i) => {
            const task = getTaskById(action.title)
            const isDone = task?.status === 'done'
            const isBlocked = action.blocked || task?.blocked
            const progress = task?.progress ?? action.progress

            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 hover:bg-slate-50 transition ${isDone ? 'opacity-60' : ''}`}
              >
                <button
                  onClick={() => {
                    if (task) {
                      if (isDone) {
                        onStatusChange(task.id, 'in_progress')
                      } else {
                        onStatusChange(task.id, 'done')
                      }
                    }
                  }}
                  className="mt-0.5 shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : isBlocked ? (
                    <AlertTriangle size={20} className="text-orange-400" />
                  ) : (
                    <Circle size={20} className="text-slate-300 hover:text-purple-400 transition" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {action.title}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      action.type === 'main'
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {action.type === 'main' ? '主线' : '支线'}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[action.priority] || 'bg-slate-300'}`} />
                    <span className="text-[10px] text-slate-400">{PRIORITY_LABELS[action.priority] || action.priority}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 flex items-center gap-0.5">
                      <Clock size={10} /> {action.estimatedMinutes}min
                    </span>
                    {isBlocked && action.blockedReason && (
                      <span className="text-xs text-orange-500">⛔ {action.blockedReason}</span>
                    )}
                    {!isDone && progress > 0 && (
                      <span className="text-xs text-slate-400">{progress}%</span>
                    )}
                  </div>
                  {!isDone && progress > 0 && !isBlocked && (
                    <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isDone
                      ? 'bg-emerald-50 text-emerald-600'
                      : isBlocked
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-slate-50 text-slate-500'
                  }`}>
                    {isDone ? '已完成' : isBlocked ? '阻塞' : STATUS_LABELS[action.status] || action.status}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function WaitingSection({ plan }: { plan: MorningPlan }) {
  if (plan.waiting.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-orange-200 shadow-sm">
      <div className="p-4 border-b border-orange-100">
        <h2 className="text-base font-semibold text-orange-700 flex items-center gap-2">
          <AlertTriangle size={18} /> ⏳ Waiting - 阻塞跟进
        </h2>
      </div>
      <div className="divide-y divide-orange-50">
        {plan.waiting.map((w, i) => (
          <div key={i} className="flex items-start gap-3 p-4">
            <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700">{w.title}</p>
              <p className="text-xs text-orange-500 mt-0.5">{w.reason}</p>
            </div>
          </div>
        ))}
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">📌 昨日遗留</h2>
      </div>
      <div className="p-4 space-y-3">
        {plan.yesterdayUnfinished.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">⏳ 未完成 → 今日待续</p>
            {plan.yesterdayUnfinished.map((t, i) => (
              <div key={i} className="flex items-center gap-2 ml-2 py-0.5">
                <Circle size={10} className="text-slate-300" />
                <span className="text-xs text-slate-600">{t.title}</span>
                <span className="text-[10px] text-slate-400">{t.progress}%</span>
              </div>
            ))}
          </div>
        )}
        {plan.yesterdayTomorrowPlan.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">💡 昨日计划 → 今日继承</p>
            {plan.yesterdayTomorrowPlan.map((p, i) => (
              <div key={i} className="flex items-center gap-2 ml-2 py-0.5">
                <ChevronRight size={10} className="text-purple-400" />
                <span className="text-xs text-slate-600">{p}</span>
              </div>
            ))}
          </div>
        )}
        {plan.yesterdayBlockers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-orange-500 mb-1">🔄 阻塞 → 今日跟进</p>
            {plan.yesterdayBlockers.map((b, i) => (
              <div key={i} className="flex items-center gap-2 ml-2 py-0.5">
                <AlertTriangle size={10} className="text-orange-400" />
                <span className="text-xs text-slate-600">{b}</span>
              </div>
            ))}
          </div>
        )}
        {plan.yesterdayCompleted.length > 0 && (
          <div>
            <p className="text-xs font-medium text-emerald-500 mb-1">✅ 昨日已完成</p>
            {plan.yesterdayCompleted.map((t, i) => (
              <div key={i} className="flex items-center gap-2 ml-2 py-0.5">
                <CheckCircle2 size={10} className="text-emerald-400" />
                <span className="text-xs text-slate-400 line-through">{t}</span>
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">📥 Inbox - 今日新增</h2>
      </div>
      <div className="p-4">
        {plan.inbox.map((t, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="text-xs text-slate-400">{i + 1}.</span>
            <span className="text-xs text-slate-600">{typeof t === 'string' ? t : t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotesSection({ notes }: { notes: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">📝 注意事项</h2>
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-600 whitespace-pre-wrap">{notes}</p>
      </div>
    </div>
  )
}

function AIContentSection({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-white rounded-xl border border-purple-200 shadow-sm">
      <div
        className="p-4 border-b border-purple-100 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-base font-semibold text-purple-700 flex items-center gap-2">
          <Sparkles size={18} /> 🤖 AI 规划内容
        </h2>
        <span className="text-xs text-purple-400">{expanded ? '收起' : '展开'}</span>
      </div>
      {expanded && (
        <div className="p-4">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{content}</pre>
        </div>
      )}
    </div>
  )
}
