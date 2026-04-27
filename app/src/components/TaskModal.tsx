import { useState, useEffect, useRef } from 'react'
import type { Task, TaskType, TaskPriority } from '../types'
import { PRIORITY_LABELS } from '../types'
import { suggestPriority } from '../utils/priority'
import { tagsApi } from '../api'
import { X, Sparkles, Plus, Ban } from 'lucide-react'

interface Props {
  open: boolean
  task: Task | null
  onClose: () => void
  onSave: (task: Partial<Task>) => void
}

const EMPTY_TASK = {
  title: '',
  description: '',
  type: 'main' as TaskType,
  priority: 'P2' as TaskPriority,
  status: 'todo' as Task['status'],
  progress: 0,
  blocked: false,
  blockedReason: '',
  estimatedMinutes: 30,
  deadline: '',
  tags: [] as string[],
}

export default function TaskModal({ open, task, onClose, onSave }: Props) {
  const [form, setForm] = useState(EMPTY_TASK)
  const [allTags, setAllTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      tagsApi.list().then(setAllTags).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        status: task.status,
        progress: task.progress ?? 0,
        blocked: task.blocked ?? false,
        blockedReason: task.blockedReason ?? '',
        estimatedMinutes: task.estimatedMinutes,
        deadline: task.deadline || '',
        tags: [...task.tags],
      })
    } else {
      setForm({ ...EMPTY_TASK, tags: [] })
    }
    setTagInput('')
    setShowTagDropdown(false)
  }, [task, open])

  const handleAutoPriority = () => {
    const suggested = suggestPriority({
      type: form.type,
      deadline: form.deadline || null,
      estimatedMinutes: form.estimatedMinutes,
    })
    setForm(f => ({ ...f, priority: suggested }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const finalTags = [...form.tags]
    if (tagInput.trim() && !finalTags.includes(tagInput.trim())) {
      finalTags.push(tagInput.trim())
    }
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      priority: form.priority,
      status: form.status,
      progress: form.status === 'done' ? 100 : form.progress,
      blocked: form.status === 'done' ? false : form.blocked,
      blockedReason: form.status === 'done' ? '' : (form.blocked ? form.blockedReason : ''),
      estimatedMinutes: form.estimatedMinutes,
      deadline: form.deadline || null,
      tags: finalTags,
    })
  }

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm(f => ({ ...f, tags: [...f.tags, trimmed] }))
    }
    setTagInput('')
    setShowTagDropdown(false)
  }

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (tagInput.trim()) {
        addTag(tagInput)
      }
    } else if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1])
    }
  }

  const filteredTags = allTags.filter(
    t => !form.tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            {task ? '编辑任务' : '新建任务'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">任务名称 *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder="输入任务名称"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
              rows={3}
              placeholder="任务描述（可选）"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">任务类型</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as TaskType }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                <option value="main">🎯 主线（日常确定性工作）</option>
                <option value="side">🔧 支线（临时交办/调研类）</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                优先级
                <button
                  type="button"
                  onClick={handleAutoPriority}
                  className="ml-2 inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800"
                >
                  <Sparkles size={12} /> 智能推荐
                </button>
              </label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{k} - {v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">预估时长（分钟）</label>
              <input
                type="number"
                value={form.estimatedMinutes}
                onChange={e => setForm(f => ({ ...f, estimatedMinutes: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                min={5}
                step={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">截止日期</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {(form.status === 'in_progress' || (task && task.status === 'in_progress')) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                任务进度 <span className={`ml-2 font-semibold ${form.progress >= 80 ? 'text-emerald-600' : form.progress >= 50 ? 'text-blue-600' : 'text-slate-500'}`}>{form.progress}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) }))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {task && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({
                  ...f,
                  status: e.target.value as Task['status'],
                  progress: e.target.value === 'done' ? 100 : f.progress,
                  blocked: e.target.value === 'done' ? false : f.blocked,
                  blockedReason: e.target.value === 'done' ? '' : f.blockedReason,
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                <option value="todo">待办</option>
                <option value="in_progress">进行中</option>
                <option value="done">已完成</option>
              </select>
            </div>
          )}

          <div className="border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <Ban size={14} className={form.blocked ? 'text-orange-500' : 'text-slate-400'} />
                任务阻塞
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={form.blocked}
                onClick={() => setForm(f => ({ ...f, blocked: !f.blocked, blockedReason: !f.blocked ? (f.blockedReason || '') : '' }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.blocked ? 'bg-orange-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.blocked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {form.blocked && (
              <div>
                <input
                  type="text"
                  value={form.blockedReason}
                  onChange={e => setForm(f => ({ ...f, blockedReason: e.target.value }))}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm bg-orange-50/50"
                  placeholder="阻塞原因，如：等待开发修复bug、缺少测试账号..."
                  autoFocus
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">标签</label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white min-h-[40px]">
              {form.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-400 hover:text-blue-700"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <div className="relative flex-1 min-w-[120px]">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={e => { setTagInput(e.target.value); setShowTagDropdown(true) }}
                  onFocus={() => setShowTagDropdown(true)}
                  onKeyDown={handleTagKeyDown}
                  className="w-full outline-none text-sm border-none p-0 focus:ring-0"
                  placeholder={form.tags.length === 0 ? '输入或选择标签...' : ''}
                />
                {showTagDropdown && (filteredTags.length > 0 || tagInput.trim()) && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto w-56">
                    {tagInput.trim() && !form.tags.includes(tagInput.trim()) && !allTags.includes(tagInput.trim()) && (
                      <button
                        type="button"
                        onClick={() => addTag(tagInput)}
                        className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-1.5"
                      >
                        <Plus size={14} /> 创建 "{tagInput.trim()}"
                      </button>
                    )}
                    {filteredTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {allTags.length > 0 && form.tags.length === 0 && !showTagDropdown && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-xs text-slate-400 mr-1">快捷选择:</span>
                {allTags.slice(0, 8).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="px-1.5 py-0.5 text-xs bg-slate-50 text-slate-500 rounded hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            )}
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
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              {task ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
