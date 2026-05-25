import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { taskApi } from '../api'
import type { Task } from '../types'
import { getMonthKey, getYearKey, getMonthLabel, formatDateShort } from '../utils/priority'
import Layout from '../components/Layout'
import { Archive, Search, Trash2, RotateCcw, AlertTriangle } from 'lucide-react'

function getCompletedMonth(task: Task): string {
  const dateStr = task.completedAt || task.archivedAt || task.updatedAt
  return getMonthKey(dateStr)
}

function isExpired(task: Task): boolean {
  if (!task.archivedAt) return false
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  return new Date(task.archivedAt) < sixMonthsAgo
}

export default function ArchivedTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [expiredTasks, setExpiredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [archivedRes, expiredRes] = await Promise.all([
        taskApi.listArchived(1, 200),
        taskApi.listExpired(),
      ])
      setTasks(archivedRes.tasks)
      setExpiredTasks(expiredRes.tasks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    try {
      await taskApi.bulkDelete([id])
      fetchData()
    } catch (err) { console.error(err) }
  }

  const handleRestore = async (id: string) => {
    try {
      await taskApi.update(id, { archived: false, archivedAt: null })
      fetchData()
    } catch (err) { console.error(err) }
  }

  const handleBulkClean = async () => {
    const ids = expiredTasks.map(t => t.id)
    if (ids.length === 0) return
    if (!confirm(`确认清理 ${ids.length} 条到期归档任务？此操作不可撤销。`)) return
    try {
      await taskApi.bulkDelete(ids)
      fetchData()
    } catch (err) { console.error(err) }
  }

  const handleCleanMonth = async (monthTasks: Task[]) => {
    const ids = monthTasks.filter(t => isExpired(t)).map(t => t.id)
    if (ids.length === 0) return
    if (!confirm(`确认清理 ${ids.length} 条到期任务？`)) return
    try {
      await taskApi.bulkDelete(ids)
      fetchData()
    } catch (err) { console.error(err) }
  }

  const filteredTasks = useMemo(() => {
    if (!search) return tasks
    return tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
  }, [tasks, search])

  const monthGroups = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of filteredTasks) {
      const mk = getCompletedMonth(t)
      if (!map.has(mk)) map.set(mk, [])
      map.get(mk)!.push(t)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredTasks])

  const currentMonth = getMonthKey(new Date().toISOString().slice(0, 10))
  const expiredIds = new Set(expiredTasks.map(t => t.id))

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20 text-[#94a3b8]">加载中...</div>
      </Layout>
    )
  }

  let lastYear = ''

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#f1f5f9] rounded-xl flex items-center justify-center">
              <Archive size={24} className="text-[#64748b]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1e3a5f]">归档任务</h1>
              <p className="text-sm text-[#64748b]">历史已完成任务 · 6个月后可清理</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索任务标题..."
                className="pl-9 pr-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none bg-[#f8fafc] w-48"
              />
            </div>
            {expiredTasks.length > 0 && (
              <button
                onClick={handleBulkClean}
                className="px-4 py-2.5 bg-[#dc2626] text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#b91c1c] transition shadow-sm"
              >
                <Trash2 size={14} /> 批量清理到期 ({expiredTasks.length})
              </button>
            )}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Archive size={32} className="text-[#cbd5e1]" />
            </div>
            <p className="text-[#64748b]">暂无归档任务</p>
            <Link to="/" className="text-sm text-[#3b82f6] hover:underline mt-2 inline-block">返回看板</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {monthGroups.map(([monthKey, monthTasks]) => {
              const year = getYearKey(monthKey)
              const isCurrentMonth = monthKey === currentMonth
              const hasExpired = monthTasks.some(t => expiredIds.has(t.id))
              const allExpired = monthTasks.every(t => expiredIds.has(t.id))
              const showYearSep = year !== lastYear
              lastYear = year

              return (
                <div key={monthKey}>
                  {showYearSep && !isCurrentMonth && (
                    <div className="text-center py-2 text-sm text-[#94a3b8] border-t-2 border-[#e2e8f0] mt-2">
                      ─── {year}年 ───
                    </div>
                  )}
                  <MonthGroup
                    monthKey={monthKey}
                    monthTasks={monthTasks}
                    isCurrentMonth={isCurrentMonth}
                    hasExpired={hasExpired}
                    allExpired={allExpired}
                    expiredIds={expiredIds}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                    onCleanMonth={handleCleanMonth}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

function MonthGroup({ monthKey, monthTasks, isCurrentMonth, hasExpired, allExpired, expiredIds, onDelete, onRestore, onCleanMonth }: {
  monthKey: string
  monthTasks: Task[]
  isCurrentMonth: boolean
  hasExpired: boolean
  allExpired: boolean
  expiredIds: Set<string>
  onDelete: (id: string) => void
  onRestore: (id: string) => void
  onCleanMonth: (monthTasks: Task[]) => void
}) {
  const [expanded, setExpanded] = useState(isCurrentMonth)

  const headerBg = allExpired ? 'bg-[#fef2f2]' : hasExpired ? 'bg-[#fefce8]' : 'bg-[#f8fafc]'
  const borderColor = allExpired ? 'border-[#fecaca]' : hasExpired ? 'border-[#fde68a]' : 'border-[#e2e8f0]'

  return (
    <div className={`border ${borderColor} rounded-xl overflow-hidden`}>
      <div
        className={`px-3 py-2 ${headerBg} flex items-center justify-between cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${expanded ? 'text-[#1e3a5f]' : 'text-[#94a3b8]'}`}>
            {expanded ? '▼' : '▶'}
          </span>
          <strong className={`text-sm ${allExpired ? 'text-[#991b1b]' : 'text-[#1e3a5f]'}`}>
            {getMonthLabel(monthKey)}
          </strong>
          <span className="bg-[#f1f5f9] text-[#64748b] rounded-full px-1.5 py-0.5 text-[9px] font-medium">
            {monthTasks.length}项
          </span>
          {hasExpired && !allExpired && (
            <span className="bg-[#fefce8] text-[#92400e] rounded-full px-1.5 py-0.5 text-[9px] font-medium flex items-center gap-1">
              <AlertTriangle size={8} /> 含到期任务
            </span>
          )}
          {allExpired && (
            <span className="bg-[#fee2e2] text-[#dc2626] rounded-full px-1.5 py-0.5 text-[9px] font-medium">
              已到期
            </span>
          )}
        </div>
        {allExpired && (
          <button
            onClick={e => { e.stopPropagation(); onCleanMonth(monthTasks) }}
            className="bg-[#dc2626] text-white rounded-lg px-2.5 py-1 text-[10px] font-semibold hover:bg-[#b91c1c] transition"
          >
            清理全部
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-3 py-2 space-y-1.5">
          {monthTasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                expiredIds.has(task.id) ? 'bg-[#fef2f2] border-[#fecaca]' : 'bg-[#ecfdf5] border-[#a7f3d0]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full ${expiredIds.has(task.id) ? 'bg-[#dc2626]' : 'bg-[#10b981]'}`} />
                <span className="text-[12px] text-[#64748b] line-through truncate">{task.title}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#94a3b8] shrink-0 ml-2">
                <span>完成于 {task.completedAt ? formatDateShort(task.completedAt) : '未知'}</span>
                <button
                  onClick={() => onRestore(task.id)}
                  className="text-[#3b82f6] hover:text-[#1e40af] transition"
                  title="恢复到看板"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onClick={() => onDelete(task.id)}
                  className="text-[#dc2626] hover:text-[#b91c1c] transition"
                  title="删除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
