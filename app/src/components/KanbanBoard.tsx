import type { Task, TaskType, TaskStatus } from '../types'
import { formatMinutes } from '../utils/priority'
import { Ban } from 'lucide-react'
import TaskCard from './TaskCard'

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: '待办', color: 'border-slate-300' },
  { status: 'in_progress', label: '进行中', color: 'border-blue-400' },
  { status: 'done', label: '已完成', color: 'border-emerald-400' },
]

interface Props {
  title: string
  type: TaskType
  tasks: Task[]
  onEdit: (task: Task) => void
  onStatusChange: (id: string, status: Task['status']) => void
  onDelete: (id: string) => void
}

export default function KanbanBoard({ title, type, tasks, onEdit, onStatusChange, onDelete }: Props) {
  const typeColor = type === 'main' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
  const typeTextColor = type === 'main' ? 'text-blue-700' : 'text-amber-700'
  const totalMinutes = tasks.filter(t => t.status !== 'done').reduce((s, t) => s + t.estimatedMinutes, 0)

  return (
    <div className={`rounded-xl border-2 ${typeColor} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-lg font-bold ${typeTextColor}`}>
          {type === 'main' ? '🎯' : '🔧'} {title}
        </h2>
        <span className="text-xs text-slate-500">
          {tasks.filter(t => t.status === 'done').length}/{tasks.length} 完成 · {formatMinutes(totalMinutes)} 剩余
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status)
          const blockedCount = colTasks.filter(t => t.blocked).length
          const activeCount = colTasks.filter(t => !t.blocked).length
          const sortedTasks = [...colTasks].sort((a, b) => {
            if (a.blocked !== b.blocked) return a.blocked ? 1 : -1
            return 0
          })
          return (
            <div key={col.status} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${col.status === 'todo' ? 'bg-slate-400' : col.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                <span className="text-sm font-medium text-slate-600">{col.label}</span>
                <span className="text-xs text-slate-400">({activeCount})</span>
                {blockedCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-orange-600">
                    <Ban size={10} /> {blockedCount}
                  </span>
                )}
              </div>
              <div className="space-y-1 min-h-[60px]">
                {sortedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={onEdit}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-lg">
                    暂无任务
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
