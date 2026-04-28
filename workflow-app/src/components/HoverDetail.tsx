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
  let deadlineCls = 'text-[#64748b]'
  if (task.deadline && task.status !== 'done') {
    if (days !== null) {
      if (days < 0) { deadlineLabel = `已逾期 ${Math.abs(days)} 天`; deadlineCls = 'text-[#dc2626]' }
      else if (days === 0) { deadlineLabel = '今日截止'; deadlineCls = 'text-[#dc2626]' }
      else if (days === 1) { deadlineLabel = '明天截止'; deadlineCls = 'text-[#ea580c]' }
      else if (days <= 3) { deadlineLabel = `${days}天后截止`; deadlineCls = 'text-[#ea580c]' }
      else { deadlineLabel = task.deadline; deadlineCls = 'text-[#64748b]' }
    }
  } else if (task.deadline && task.status === 'done') {
    deadlineLabel = task.deadline
    deadlineCls = 'text-[#94a3b8] line-through'
  }

  return (
    <div
      ref={popoverRef}
      className={`fixed z-[60] w-72 bg-white rounded-xl shadow-xl border border-[#e2e8f0] overflow-hidden pointer-events-none ${
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
      <div className="p-4 space-y-3">
        {/* 标题和优先级 */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-[#1e293b] leading-snug">{task.title}</h4>
          <span className={`shrink-0 px-2 py-1 text-[10px] font-semibold rounded-md ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority} {PRIORITY_LABELS[task.priority]}
          </span>
        </div>

        {/* 描述 */}
        {task.description && (
          <p className="text-xs text-[#64748b] leading-relaxed line-clamp-3">{task.description}</p>
        )}

        {/* 阻塞原因 */}
        {task.blocked && task.blockedReason && (
          <div className="px-3 py-2 bg-[#fff7ed] rounded-lg text-xs text-[#c2410c] border border-[#fed7aa]">
            🚫 {task.blockedReason}
          </div>
        )}

        {/* 进度条 */}
        {task.status === 'in_progress' && !task.blocked && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-[#94a3b8]">进度</span>
              <span className="text-[10px] font-bold text-[#3b82f6]">
                {progress}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-[#3b82f6]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 时间和截止信息 */}
        <div className="flex items-center gap-3 text-[11px] flex-wrap">
          <span className="flex items-center gap-1 text-[#64748b]">
            <Clock size={11} /> {formatMinutes(task.estimatedMinutes)}
          </span>
          {task.deadline && (
            <span className={`flex items-center gap-1 ${deadlineCls}`}>
              <Calendar size={11} /> {deadlineLabel || task.deadline}
            </span>
          )}
        </div>

        {/* 标签 */}
        {task.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {task.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 text-[10px] bg-[#f1f5f9] text-[#64748b] rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 优先级原因 */}
        {priority.reason && task.status !== 'done' && !task.blocked && (
          <p className="text-[10px] text-[#94a3b8] italic flex items-center gap-1">
            <Sparkles size={10} /> {priority.reason}
          </p>
        )}
      </div>
    </div>
  )
}
