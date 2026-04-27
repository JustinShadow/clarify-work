import { useState, useEffect, useCallback } from 'react'
import type { Task } from '../types'
import { taskApi, statsApi } from '../api'
import { sortTasksByPriority, getTodayDateStr } from '../utils/priority'

import Layout from '../components/Layout'
import KanbanBoard from '../components/KanbanBoard'
import TaskModal from '../components/TaskModal'
import StatsBar from '../components/StatsBar'
import DailyReportModal from '../components/DailyReportModal'

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const [taskData, statsData] = await Promise.all([taskApi.list(), statsApi.get()])
      setTasks(sortTasksByPriority(taskData))
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
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

  const handleGenerateReport = () => {
    setReportModalOpen(true)
  }

  const today = getTodayDateStr()
  const mainTasks = tasks.filter(t => t.type === 'main')
  const sideTasks = tasks.filter(t => t.type === 'side')

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">今日看板</h1>
            <p className="text-sm text-slate-500 mt-1">{today} {new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerateReport}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
            >
              生成日报
            </button>
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              + 新建任务
            </button>
          </div>
        </div>

        {stats && <StatsBar stats={stats} />}

        {loading ? (
          <div className="text-center py-20 text-slate-400">加载中...</div>
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

      <DailyReportModal
        open={reportModalOpen}
        tasks={tasks}
        onClose={() => setReportModalOpen(false)}
        onGenerated={fetchTasks}
      />
    </Layout>
  )
}
