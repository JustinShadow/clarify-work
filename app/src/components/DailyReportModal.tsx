import { useState } from 'react'
import type { Task } from '../types'
import { getTodayDateStr } from '../utils/priority'
import { dailyReportApi } from '../api'
import { X, FileText, Loader2 } from 'lucide-react'

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

  const [tomorrowPlan, setTomorrowPlan] = useState('')
  const [blockers, setBlockers] = useState(initialBlockers)
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState(false)

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
      })
      onGenerated()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText size={20} /> 生成日报 - {today}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-700 mb-2">🎯 主线完成 ({completedMain.length})</h4>
            {completedMain.length === 0 ? (
              <p className="text-xs text-blue-400">无</p>
            ) : (
              <ul className="space-y-1">
                {completedMain.map(t => (
                  <li key={t.id} className="text-sm text-blue-800">✓ {t.title}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-amber-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-amber-700 mb-2">🔧 支线完成 ({completedSide.length})</h4>
            {completedSide.length === 0 ? (
              <p className="text-xs text-amber-400">无</p>
            ) : (
              <ul className="space-y-1">
                {completedSide.map(t => (
                  <li key={t.id} className="text-sm text-amber-800">✓ {t.title}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-slate-700 mb-2">⏳ 进行中 ({inProgress.length})</h4>
            {inProgress.length === 0 ? (
              <p className="text-xs text-slate-400">无</p>
            ) : (
              <ul className="space-y-1">
                {inProgress.map(t => (
                  <li key={t.id} className={`text-sm ${t.blocked ? 'text-orange-600' : 'text-slate-700'}`}>
                    {t.blocked ? '🚫' : '○'} {t.title} [{t.type === 'main' ? '主线' : '支线'}]
                    {t.blocked && t.blockedReason && <span className="text-xs ml-1">— {t.blockedReason}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-slate-700 mb-2">📋 待办 ({todo.length})</h4>
            {todo.length === 0 ? (
              <p className="text-xs text-slate-400">无</p>
            ) : (
              <ul className="space-y-1">
                {todo.map(t => (
                  <li key={t.id} className="text-sm text-slate-700">· {t.title} [{t.type === 'main' ? '主线' : '支线'}]</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">明日计划（每行一条）</label>
            <textarea
              value={tomorrowPlan}
              onChange={e => setTomorrowPlan(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
              rows={3}
              placeholder="如：&#10;完成v2.3回归测试&#10;开始接口自动化脚本更新"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">风险/阻塞（每行一条）</label>
            <textarea
              value={blockers}
              onChange={e => setBlockers(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
              rows={2}
              placeholder="如：&#10;测试环境不稳定，影响执行进度"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">补充说明</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
              rows={2}
              placeholder="其他需要记录的内容"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              取消
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {generating ? '生成中...' : '生成日报'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
