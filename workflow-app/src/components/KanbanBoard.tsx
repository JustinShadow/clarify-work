import type { Task, TaskType, TaskStatus } from '../types'
import { formatMinutes } from '../utils/priority'
import { Ban, Target, Wrench } from 'lucide-react'
import TaskCard from './TaskCard'

const COLUMNS: { status: TaskStatus; label: string; color: string; bgColor: string; dotColor: string }[] = [
  { 
    status: 'todo', 
    label: '待办', 
    color: 'border-[#cbd5e1]',
    bgColor: 'bg-[#f8fafc]',
    dotColor: 'bg-[#94a3b8]'
  },
  { 
    status: 'in_progress', 
    label: '进行中', 
    color: 'border-[#3b82f6]',
    bgColor: 'bg-[#eff6ff]',
    dotColor: 'bg-[#3b82f6]'
  },
  { 
    status: 'done', 
    label: '已完成', 
    color: 'border-[#10b981]',
    bgColor: 'bg-[#ecfdf5]',
    dotColor: 'bg-[#10b981]'
  },
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
  // 主线任务使用蓝色系，支线任务使用琥珀色系
  const isMain = type === 'main'
  const boardColors = isMain 
    ? 'bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] border-[#3b82f6]'
    : 'bg-gradient-to-br from-[#fffbeb] to-[#fef3c7] border-[#fbbf24]'
  
  const headerColors = isMain
    ? 'text-[#1e3a5f]'
    : 'text-[#92400e]'
    
  const iconBgColors = isMain
    ? 'bg-[#1e3a5f] text-white'
    : 'bg-[#f59e0b] text-white'

  const totalMinutes = tasks.filter(t => t.status !== 'done').reduce((s, t) => s + t.estimatedMinutes, 0)
  const completedCount = tasks.filter(t => t.status === 'done').length

  return (
    <div className={`rounded-2xl border-2 ${boardColors} p-5 shadow-sm`}>
      {/* 看板头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${iconBgColors} flex items-center justify-center shadow-sm`}>
            {isMain ? <Target size={18} /> : <Wrench size={18} />}
          </div>
          <h2 className={`text-lg font-bold ${headerColors}`}>
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2.5 py-1 bg-white/60 rounded-full font-medium text-[#64748b]">
            {completedCount}/{tasks.length} 完成
          </span>
          {totalMinutes > 0 && (
            <span className="px-2.5 py-1 bg-white/60 rounded-full font-medium text-[#64748b]">
              {formatMinutes(totalMinutes)} 剩余
            </span>
          )}
        </div>
      </div>

      {/* 三列布局 */}
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
              {/* 列标题 */}
              <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg ${col.bgColor} border ${col.color}`}>
                <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span className="text-sm font-semibold text-[#475569]">{col.label}</span>
                <span className="text-xs text-[#94a3b8] font-medium">({activeCount})</span>
                {blockedCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#ea580c] ml-auto">
                    <Ban size={10} /> {blockedCount}
                  </span>
                )}
              </div>
              
              {/* 任务列表 */}
              <div className="space-y-2 min-h-[80px]">
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
                  <div className="text-xs text-[#94a3b8] text-center py-8 border border-dashed border-[#e2e8f0] rounded-xl bg-white/50">
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
