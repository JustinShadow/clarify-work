import { useState, useEffect, useCallback } from 'react'
import type { Task } from '../types'
import { taskApi, statsApi } from '../api'
import { sortTasksByPriority, getTodayDateStr } from '../utils/priority'

import Layout from '../components/Layout'
import KanbanBoard from '../components/KanbanBoard'
import TaskModal from '../components/TaskModal'
import StatsBar from '../components/StatsBar'
import { Plus, Calendar } from 'lucide-react'

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [stats, setStats] = useState<{ total: number; todo: number; inProgress: number; blocked: number; done: number; totalEstimatedMinutes: number; completedToday: number; overdueCount: number; overdueTasks: Task[]; mainCount: number; sideCount: number } | null>(null)

  const fetchTasks = useCallback(async (signal?: AbortSignal) => {
    try {
      const [taskData, statsData] = await Promise.all([taskApi.list(), statsApi.get()])
      if (signal?.aborted) return
      setTasks(sortTasksByPriority(taskData))
      setStats(statsData)
    } catch (err) {
      if (signal?.aborted) return
      console.error('Failed to fetch tasks:', err)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    fetchTasks(ac.signal)
    return () => ac.abort()
  }, [fetchTasks])

  const handleCreateTask = () => {
    setEditingTask(null)
    setModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setModalOpen(true)
  }

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await taskApi.update(editingTask.id, taskData)
    } else {
      await taskApi.create(taskData)
    }
    setModalOpen(false)
    setEditingTask(null)
    fetchTasks()
  }

  const handleDeleteTask = async (id: string) => {
    await taskApi.delete(id)
    fetchTasks()
  }

  const handleStatusChange = async (id: string, status: Task['status']) => {
    await taskApi.update(id, { status })
    fetchTasks()
  }

  const today = getTodayDateStr()
  const mainTasks = tasks.filter(t => t.type === 'main')
  const sideTasks = tasks.filter(t => t.type === 'side')

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">今日看板</h1>
            <p className="text-sm text-[#64748b] mt-1 flex items-center gap-2">
              <Calendar size={14} />
              {today} {new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}
            </p>
          </div>
          <button
            onClick={handleCreateTask}
            className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#1e4976] transition text-sm font-semibold shadow-md flex items-center gap-2"
          >
            <Plus size={18} /> 新建任务
          </button>
        </div>

        {stats && <StatsBar stats={stats} />}

        {loading ? (
          <div className="text-center py-20 text-[#94a3b8]">
            <div className="w-12 h-12 border-4 border-[#e2e8f0] border-t-[#3b82f6] rounded-full animate-spin mx-auto mb-4"></div>
            加载中...
          </div>
        ) : (
          <div className="space-y-6">
            <KanbanBoard
              title="主线任务"
              type="main"
              tasks={mainTasks}
              onEdit={handleEditTask}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTask}
            />
            <KanbanBoard
              title="支线任务"
              type="side"
              tasks={sideTasks}
              onEdit={handleEditTask}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTask}
            />
          </div>
        )}
      </div>

      <TaskModal
        open={modalOpen}
        task={editingTask}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
        onSave={handleSaveTask}
      />
    </Layout>
  )
}