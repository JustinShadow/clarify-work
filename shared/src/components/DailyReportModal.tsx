import { useState } from 'react'
import type { Task } from '../types'
import { getTodayDateStr } from '../utils/priority'
import { dailyReportApi, llmApi } from '../api'
import { X, FileText, Loader2, Sparkles, Target, Wrench, Clock, AlertTriangle, ListTodo } from 'lucide-react'
import LLMDialog from './LLMDialog'
import { useScrollLock } from '../hooks/useScrollLock'

interface Props {
  open: boolean
  tasks: Task[]
  onClose: () => void
  onGenerated: () => void
}

export default function DailyReportModal({ open, tasks, onClose, onGenerated }: Props) {
  const today = getTodayDateStr()
  const blockedTasks = tasks.filter(t => t.blocked)
  const autoBlockerLines = blockedTasks
    .filter(t => t.blockedReason)
    .map(t => `${t.title}：${t.blockedReason}`)
  const initialBlockers = autoBlockerLines.length > 0 ? autoBlockerLines.join('\n') : ''

  useScrollLock(open)

  const [tomorrowPlan, setTomorrowPlan] = useState('')
  const [blockers, setBlockers] = useState(initialBlockers)
  const [notes, setNotes] = useState('')
  const [focusScore, setFocusScore] = useState(0)
  const [deviationAnalysis, setDeviationAnalysis] = useState('')
  const [improvementMeasures, setImprovementMeasures] = useState('')
  const [generating, setGenerating] = useState(false)
  const [llmOpen, setLlmOpen] = useState(false)
  const [llmContent, setLlmContent] = useState('')

  const completedMain = tasks.filter(t => t.type === 'main' && t.status === 'done' && t.completedAt?.startsWith(today))
  const completedSide = tasks.filter(t => t.type === 'side' && t.status === 'done' && t.completedAt?.startsWith(today))
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const todo = tasks.filter(t => t.status === 'todo')

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await dailyReportApi.generate({
        date: today,
        tomorrowPlan: tomorrowPlan.split('\n').filter(Boolean),
        blockers: blockers.split('\n').filter(Boolean),
        notes,
        focusScore: focusScore || undefined,
        deviationAnalysis,
        improvementMeasures,
        llmContent,
      })
      onGenerated()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const contextSummary = `今日任务状态: 主线完成${completedMain.length} | 支线完成${completedSide.length} | 进行中${inProgress.length} | 待办${todo.length} | 阻塞${blockedTasks.length}`

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1e3a5f]/30 backdrop-blur-sm" onWheel={e => e.stopPropagation()}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0] sticky top-0 bg-white z-10">
            <h3 className="text-lg font-bold text-[#1e293b] flex items-center gap-2">
              <div className="w-9 h-9 bg-[#10b981] rounded-xl flex items-center justify-center">
                <FileText size={18} className="text-white" />
              </div>
              生成日报 - {today}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors">
              <X size={20} className="text-[#94a3b8]" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] rounded-xl p-4 border border-[#bfdbfe]">
              <h4 className="text-sm font-bold text-[#1e3a5f] mb-3 flex items-center gap-2">
                <Target size={16} /> 主线完成 ({completedMain.length})
              </h4>
              {completedMain.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">无</p>
              ) : (
                <ul className="space-y-2">
                  {completedMain.map(t => (
                    <li key={t.id} className="text-sm text-[#1e3a5f] flex items-center gap-2">
                      <span className="text-[#10b981]">✓</span> {t.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-gradient-to-br from-[#fffbeb] to-[#fef3c7] rounded-xl p-4 border border-[#fde68a]">
              <h4 className="text-sm font-bold text-[#92400e] mb-3 flex items-center gap-2">
                <Wrench size={16} /> 支线完成 ({completedSide.length})
              </h4>
              {completedSide.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">无</p>
              ) : (
                <ul className="space-y-2">
                  {completedSide.map(t => (
                    <li key={t.id} className="text-sm text-[#92400e] flex items-center gap-2">
                      <span className="text-[#10b981]">✓</span> {t.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-[#f8fafc] rounded-xl p-4 border border-[#e2e8f0]">
              <h4 className="text-sm font-bold text-[#475569] mb-3 flex items-center gap-2">
                <Clock size={16} /> 进行中 ({inProgress.length})
              </h4>
              {inProgress.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">无</p>
              ) : (
                <ul className="space-y-2">
                  {inProgress.map(t => (
                    <li key={t.id} className={`text-sm ${t.blocked ? 'text-[#c2410c]' : 'text-[#64748b]'} flex items-center gap-2`}>
                      {t.blocked ? <span className="text-[#f97316]">⛔</span> : <span className="text-[#3b82f6]">○</span>}
                      {t.title} [{t.type === 'main' ? '主线' : '支线'}] {t.progress}%
                      {t.blocked && t.blockedReason && <span className="text-xs ml-1">— {t.blockedReason}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-[#f8fafc] rounded-xl p-4 border border-[#e2e8f0]">
              <h4 className="text-sm font-bold text-[#475569] mb-3 flex items-center gap-2">
                <ListTodo size={16} /> 待办 ({todo.length})
              </h4>
              {todo.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">无</p>
              ) : (
                <ul className="space-y-2">
                  {todo.map(t => (
                    <li key={t.id} className="text-sm text-[#64748b] flex items-center gap-2">
                      <span>·</span> {t.title} [{t.type === 'main' ? '主线' : '支线'}]
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-[#e2e8f0] pt-4">
              <h4 className="text-sm font-bold text-[#475569] mb-4 flex items-center gap-2">
                <div className="w-6 h-6 bg-[#3b82f6] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs">PDCA</span>
                </div>
                复盘总结
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#64748b] mb-2">专注度评分 (1-5)</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setFocusScore(n)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition ${
                          focusScore >= n
                            ? 'bg-[#3b82f6] text-white'
                            : 'bg-[#f1f5f9] text-[#94a3b8] hover:bg-[#e2e8f0]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-[#64748b] mb-2">偏差分析 (Check)</label>
                <textarea
                  value={deviationAnalysis}
                  onChange={e => setDeviationAnalysis(e.target.value)}
                  className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm resize-none bg-[#f8fafc]"
                  rows={2}
                  placeholder="计划与实际的偏差..."
                />
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-[#64748b] mb-2">改进措施 (Act)</label>
                <textarea
                  value={improvementMeasures}
                  onChange={e => setImprovementMeasures(e.target.value)}
                  className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm resize-none bg-[#f8fafc]"
                  rows={2}
                  placeholder="下一步改进措施..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#475569] mb-2 flex items-center gap-2">
                <CalendarIcon />
                明日计划（每行一条）
              </label>
              <textarea
                value={tomorrowPlan}
                onChange={e => setTomorrowPlan(e.target.value)}
                className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm resize-none bg-[#f8fafc]"
                rows={3}
                placeholder="如：&#10;完成v2.3回归测试&#10;开始接口自动化脚本更新"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#475569] mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#f97316]" />
                风险/阻塞（每行一条）
              </label>
              <textarea
                value={blockers}
                onChange={e => setBlockers(e.target.value)}
                className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none text-sm resize-none bg-[#f8fafc]"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#475569] mb-2">📝 补充说明</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm resize-none bg-[#f8fafc]"
                rows={2}
              />
            </div>

            {llmContent && (
              <div className="bg-[#eff6ff] rounded-xl p-4 border border-[#bfdbfe]">
                <h4 className="text-sm font-bold text-[#1e40af] mb-2 flex items-center gap-2">
                  <Sparkles size={16} /> AI 辅助内容
                </h4>
                <pre className="text-xs text-[#1e40af] whitespace-pre-wrap max-h-40 overflow-y-auto">{llmContent}</pre>
              </div>
            )}

            <div className="flex justify-between gap-2 pt-4 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setLlmOpen(true)}
                className="px-4 py-2.5 text-sm bg-[#eff6ff] text-[#1e40af] hover:bg-[#dbeafe] rounded-xl transition font-semibold flex items-center gap-2 border border-[#bfdbfe]"
              >
                <Sparkles size={16} /> AI 辅助生成
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-5 py-2.5 text-sm bg-[#10b981] text-white rounded-xl hover:bg-[#059669] transition font-semibold disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  {generating ? '生成中...' : '生成日报'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LLMDialog
        open={llmOpen}
        title="AI 生成日报"
        systemContext={contextSummary}
        onGenerate={setLlmContent}
        onClose={() => setLlmOpen(false)}
        streamFn={(body, onChunk) => llmApi.streamGenerate('/llm/generate-daily', body, onChunk)}
        streamBody={{ date: today }}
      />
    </>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#3b82f6]">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y1="10"></line>
    </svg>
  )
}