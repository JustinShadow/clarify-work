import { useRef, useState, useEffect, useCallback } from 'react'
import type { Task } from '../types'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../types'
import { formatMinutes, calculatePriority, getDaysUntilDeadline } from '../utils/priority'
import { Clock, Calendar, Sparkles } from 'lucide-react'

const HOVER_DELAY = 280

export default function HoverDetail({ task, anchorRef, visible }: {
  task: Task
  anchorRef: React.RefObject<HTMLDivElement | null>
  visible: boolean
}) {
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<'top' | 'bottom'>('top')

  const scheduleShow = useCallback(() => {
    timerRef.current = setTimeout(() => setShow(true), HOVER_DELAY)
  }, [])

  const cancelShow = useCallback(() => {
    clearTimeout(timerRef.current)
    setShow(false)
  }, [])

  useEffect(() => {
    if (visible) {
      scheduleShow()
    } else {
      cancelShow()
    }
    return () => clearTimeout(timerRef.current)
  }, [visible, scheduleShow, cancelShow])

  useEffect(() => {
    if (!show || !anchorRef.current || !popoverRef.current) return
    const anchorRect = anchorRef.current.getBoundingClientRect()
    const popHeight = popoverRef.current.offsetHeight
    const spaceAbove = anchorRect.top
    const spaceBelow = window.innerHeight - anchorRect.bottom
    if (spaceAbove < popHeight + 8 && spaceBelow > popHeight + 8) {
      setPos('bottom')
    } else {
      setPos('top')
    }
  }, [show, anchorRef])

  if (!show) return null

  const progress = task.status === 'done' ? 100 : (task.progress ?? 0)
  const priority = calculatePriority(task)
  const days = task.deadline ? getDaysUntilDeadline(task.deadline) : null

  let deadlineLabel = ''
  let deadlineCls = 'text-slate-500'
  if (task.deadline && task.status !== 'done') {
    if (days !== null) {
      if (days < 0) { deadlineLabel = `已逾期 ${Math.abs(days)} 天`; deadlineCls = 'text-red-600' }
      else if (days === 0) { deadlineLabel = '今日截止'; deadlineCls = 'text-red-600' }
      else if (days === 1) { deadlineLabel = '明天截止'; deadlineCls = 'text-orange-600' }
      else if (days <= 3) { deadlineLabel = `${days}天后截止`; deadlineCls = 'text-orange-500' }
      else { deadlineLabel = task.deadline; deadlineCls = 'text-slate-500' }
    }
  } else if (task.deadline && task.status === 'done') {
    deadlineLabel = task.deadline
    deadlineCls = 'text-slate-400 line-through'
  }

  return (
    <div
      ref={popoverRef}
      className={`fixed z-[60] w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden pointer-events-none ${
        pos === 'top' ? 'animate-fade-in-up' : 'animate-fade-in-down'
      }`}
      style={{
        left: anchorRef.current
          ? `${Math.min(anchorRef.current.getBoundingClientRect().left, window.innerWidth - 300)}px`
          : '-9999px',
        top: anchorRef.current
          ? pos === 'top'
            ? `${anchorRef.current.getBoundingClientRect().top - (popoverRef.current?.offsetHeight ?? 180) - 6}px`
            : `${anchorRef.current.getBoundingClientRect().bottom + 6}px`
          : '-9999px',
      }}
    >
      <div className="p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800 leading-snug">{task.title}</h4>
          <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority} {PRIORITY_LABELS[task.priority]}
          </span>
        </div>

        {task.description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{task.description}</p>
        )}

        {task.blocked && task.blockedReason && (
          <div className="px-2 py-1.5 bg-orange-50 rounded text-xs text-orange-700 border border-orange-200">
            🚫 {task.blockedReason}
          </div>
        )}

        {task.status === 'in_progress' && !task.blocked && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400">进度</span>
              <span className={`text-[10px] font-semibold ${progress >= 80 ? 'text-emerald-600' : progress >= 50 ? 'text-blue-600' : 'text-slate-500'}`}>
                {progress}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : progress >= 25 ? 'bg-amber-400' : 'bg-slate-300'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] flex-wrap">
          <span className="flex items-center gap-1 text-slate-500">
            <Clock size={11} /> {formatMinutes(task.estimatedMinutes)}
          </span>
          {task.deadline && (
            <span className={`flex items-center gap-1 ${deadlineCls}`}>
              <Calendar size={11} /> {deadlineLabel || task.deadline}
            </span>
          )}
        </div>

        {task.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {task.tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {priority.reason && task.status !== 'done' && !task.blocked && (
          <p className="text-[10px] text-slate-400 italic flex items-center gap-1">
            <Sparkles size={10} /> {priority.reason}
          </p>
        )}
      </div>
    </div>
  )
}
