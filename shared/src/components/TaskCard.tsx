import { useRef, useState } from 'react'
import type { Task, TaskStatus } from '../types'
import { PRIORITY_DOT } from '../types'
import { formatMinutes, isOverdue, getDaysUntilDeadline } from '../utils/priority'
import { Trash2, ChevronRight, ChevronLeft, Check, Ban, Clock } from 'lucide-react'
import HoverDetail from './HoverDetail'

interface Props {
  task: Task
  onEdit: (task: Task) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
}

const STATUS_FLOW: Record<TaskStatus, { next?: TaskStatus; prev?: TaskStatus }> = {
  todo: { next: 'in_progress' },
  in_progress: { prev: 'todo', next: 'done' },
  done: { prev: 'in_progress' },
}

export default function TaskCard({ task, onEdit, onStatusChange, onDelete }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [hovering, setHovering] = useState(false)

  const overdue = isOverdue(task)
  const blocked = task.blocked ?? false
  const progress = task.status === 'done' ? 100 : (task.progress ?? 0)
  const flow = STATUS_FLOW[task.status]

  function getDeadlineTag() {
    if (!task.deadline) return null
    const days = getDaysUntilDeadline(task.deadline)
    let label = ''
    let cls = 'text-[#94a3b8]'

    if (task.status === 'done') {
      label = task.deadline.slice(5)
      cls = 'text-[#94a3b8]'
    } else if (days < 0) {
      label = `逾期${Math.abs(days)}天`
      cls = 'text-[#dc2626] font-semibold bg-[#fee2e2] px-1.5 py-0.5 rounded text-[10px]'
    } else if (days === 0) {
      label = '今日截止'
      cls = 'text-[#dc2626] font-semibold bg-[#fee2e2] px-1.5 py-0.5 rounded text-[10px] animate-pulse'
    } else if (days === 1) {
      label = '明天'
      cls = 'text-[#ea580c] font-medium text-[10px]'
    } else if (days <= 3) {
      label = `${days}天后`
      cls = 'text-[#ea580c] text-[10px]'
    } else if (days <= 7) {
      label = task.deadline.slice(5)
      cls = 'text-[#ca8a04] text-[10px]'
    } else {
      label = task.deadline.slice(5)
      cls = 'text-[#94a3b8] text-[10px]'
    }

    return { label, cls }
  }

  const deadlineTag = getDeadlineTag()

  const cardBorder = blocked
    ? 'border-[#fed7aa] bg-[#fff7ed]'
    : overdue
      ? 'border-[#fecaca] bg-[#fef2f2]'
      : 'border-[#e2e8f0] bg-white'

  const progressColor = task.status === 'done'
    ? 'bg-[#10b981]'
    : blocked
      ? 'bg-[#f97316]'
      : 'bg-[#3b82f6]'

  const titleColor = task.status === 'done' 
    ? 'text-[#94a3b8] line-through' 
    : blocked 
      ? 'text-[#9a3412]' 
      : 'text-[#1e293b]'

  const visibleTags = task.tags.slice(0, 2)
  const extraTagCount = task.tags.length - 2

  return (
    <>
      <div
        ref={cardRef}
        className={`rounded-lg border ${cardBorder} shadow-sm hover:shadow-md hover:border-[#cbd5e1] transition-all duration-200 cursor-pointer group relative overflow-hidden`}
        onClick={() => onEdit(task)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span 
              className={`shrink-0 w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[task.priority]}`} 
              title={`优先级: ${task.priority}`} 
            />

            <h4 className={`text-[13px] font-medium truncate flex-1 min-w-0 ${titleColor}`}>
              {task.title}
            </h4>

            {blocked && (
              <Ban size={14} className="shrink-0 text-[#f97316]" />
            )}

            {deadlineTag && (
              <span className={`shrink-0 ${deadlineTag.cls}`}>{deadlineTag.label}</span>
            )}

            <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              {flow.prev && (
                <button
                  onClick={e => { e.stopPropagation(); onStatusChange(task.id, flow.prev!) }}
                  className="p-1 text-[#94a3b8] hover:text-[#3b82f6] hover:bg-[#eff6ff] rounded-md transition-colors"
                  title="回退状态"
                >
                  <ChevronLeft size={14} />
                </button>
              )}
              {flow.next && (
                <button
                  onClick={e => { e.stopPropagation(); onStatusChange(task.id, flow.next!) }}
                  className={`p-1 rounded-md transition-colors ${
                    flow.next === 'done'
                      ? 'text-[#10b981] hover:text-[#059669] hover:bg-[#ecfdf5]'
                      : 'text-[#94a3b8] hover:text-[#3b82f6] hover:bg-[#eff6ff]'
                  }`}
                  title={flow.next === 'done' ? '标记完成' : '开始处理'}
                >
                  {flow.next === 'done' ? <Check size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); onDelete(task.id) }}
                className="p-1 text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] rounded-md transition-colors"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#94a3b8]">
            <span className="flex items-center gap-0.5">
              <Clock size={10} />
              {formatMinutes(task.estimatedMinutes)}
            </span>

            {task.status === 'in_progress' && !blocked && progress > 0 && (
              <span className={`font-medium ${
                progress >= 80 ? 'text-[#10b981]' : progress >= 50 ? 'text-[#3b82f6]' : 'text-[#64748b]'
              }`}>
                {progress}%
              </span>
            )}

            {blocked && task.blockedReason && (
              <span className="text-[#f97316] truncate max-w-[120px]">{task.blockedReason}</span>
            )}

            {visibleTags.length > 0 && (
              <span className="text-[#94a3b8]">
                {visibleTags.map(t => `#${t}`).join(' ')}
                {extraTagCount > 0 && <span className="text-[#cbd5e1]"> +{extraTagCount}</span>}
              </span>
            )}
          </div>
        </div>

        {(task.status === 'in_progress' || task.status === 'done') && (
          <div className="w-full h-[3px] bg-[#f1f5f9]">
            <div
              className={`h-full ${progressColor} transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <HoverDetail
        task={task}
        anchorRef={cardRef}
        visible={hovering}
      />
    </>
  )
}