import { useRef, useState } from 'react'
import type { Task, TaskStatus } from '../types'
import { PRIORITY_DOT } from '../types'
import { formatMinutes, isOverdue, getDaysUntilDeadline } from '../utils/priority'
import { Trash2, ChevronRight, ChevronLeft, Check, Ban } from 'lucide-react'
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
    let cls = 'text-slate-400'

    if (task.status === 'done') {
      label = task.deadline.slice(5)
      cls = 'text-slate-300'
    } else if (days < 0) {
      label = `逾期${Math.abs(days)}天`
      cls = 'text-red-600 font-semibold bg-red-50 px-1 py-px rounded text-[10px]'
    } else if (days === 0) {
      label = '今日截止'
      cls = 'text-red-500 font-semibold bg-red-50 px-1 py-px rounded text-[10px] animate-pulse'
    } else if (days === 1) {
      label = '明天'
      cls = 'text-orange-600 font-medium text-[10px]'
    } else if (days <= 3) {
      label = `${days}天后`
      cls = 'text-orange-500 text-[10px]'
    } else if (days <= 7) {
      label = task.deadline.slice(5)
      cls = 'text-amber-500 text-[10px]'
    } else {
      label = task.deadline.slice(5)
      cls = 'text-slate-400 text-[10px]'
    }

    return { label, cls }
  }

  const deadlineTag = getDeadlineTag()

  const cardBorder = blocked
    ? 'border-orange-200'
    : overdue
      ? 'border-red-200'
      : 'border-slate-200'

  const progressColor = task.status === 'done'
    ? 'bg-emerald-400'
    : blocked
      ? 'bg-orange-300'
      : progress >= 80
        ? 'bg-emerald-400'
        : progress >= 50
          ? 'bg-blue-400'
          : progress >= 25
            ? 'bg-amber-300'
            : 'bg-slate-200'

  const visibleTags = task.tags.slice(0, 2)
  const extraTagCount = task.tags.length - 2

  return (
    <>
      <div
        ref={cardRef}
        className={`bg-white rounded-md border ${cardBorder} shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden`}
        onClick={() => onEdit(task)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <span className={`shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} title={`优先级: ${task.priority}`} />

            <h4 className={`text-[13px] font-medium truncate flex-1 min-w-0 ${
              task.status === 'done' ? 'line-through text-slate-400' : blocked ? 'text-orange-800' : 'text-slate-800'
            }`}>
              {task.title}
            </h4>

            {blocked && (
              <Ban size={12} className="shrink-0 text-orange-500" />
            )}

            {deadlineTag && (
              <span className={`shrink-0 ${deadlineTag.cls}`}>{deadlineTag.label}</span>
            )}

            <div className="shrink-0 flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              {flow.prev && (
                <button
                  onClick={e => { e.stopPropagation(); onStatusChange(task.id, flow.prev!) }}
                  className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="回退状态"
                >
                  <ChevronLeft size={12} />
                </button>
              )}
              {flow.next && (
                <button
                  onClick={e => { e.stopPropagation(); onStatusChange(task.id, flow.next!) }}
                  className={`p-0.5 rounded ${
                    flow.next === 'done'
                      ? 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                      : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title={flow.next === 'done' ? '标记完成' : '开始处理'}
                >
                  {flow.next === 'done' ? <Check size={12} /> : <ChevronRight size={12} />}
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); onDelete(task.id) }}
                className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="删除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
            <span>{formatMinutes(task.estimatedMinutes)}</span>

            {task.status === 'in_progress' && !blocked && progress > 0 && (
              <span className={`font-medium ${progress >= 80 ? 'text-emerald-600' : progress >= 50 ? 'text-blue-600' : 'text-slate-500'}`}>
                {progress}%
              </span>
            )}

            {blocked && task.blockedReason && (
              <span className="text-orange-500 truncate max-w-[140px]">{task.blockedReason}</span>
            )}

            {visibleTags.length > 0 && (
              <span className="text-slate-400">
                {visibleTags.map(t => `#${t}`).join(' ')}
                {extraTagCount > 0 && ` +${extraTagCount}`}
              </span>
            )}
          </div>
        </div>

        {(task.status === 'in_progress' || task.status === 'done') && (
          <div className="w-full h-[2px] bg-slate-100">
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
