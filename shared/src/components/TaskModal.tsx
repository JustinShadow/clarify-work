import { useState, useEffect, useRef } from 'react'
import type { Task, TaskType, TaskPriority, TaskEvent } from '../types'
import { PRIORITY_LABELS } from '../types'
import { suggestPriority } from '../utils/priority'
import { tagsApi } from '../api'
import { X, Sparkles, Plus, Ban, Target, Wrench, Calendar, CheckCircle2, Trash2 } from 'lucide-react'
import { useScrollLock } from '../hooks/useScrollLock'

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
  events: [] as TaskEvent[],
  result: '',
}

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  P0: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]', border: 'border-[#fecaca]' },
  P1: { bg: 'bg-[#ffedd5]', text: 'text-[#ea580c]', border: 'border-[#fed7aa]' },
  P2: { bg: 'bg-[#fef9c3]', text: 'text-[#ca8a04]', border: 'border-[#fde68a]' },
  P3: { bg: 'bg-[#f3f4f6]', text: 'text-[#6b7280]', border: 'border-[#e5e7eb]' },
}

function getToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TaskModal({ open, task, onClose, onSave }: Props) {
  const [form, setForm] = useState(EMPTY_TASK)
  const [allTags, setAllTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [eventsExpanded, setEventsExpanded] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const resultInputRef = useRef<HTMLInputElement>(null)

  useScrollLock(open)

  useEffect(() => {
    if (open) {
      let stale = false
      tagsApi.list().then(tags => { if (!stale) setAllTags(tags) }).catch(() => {})
      return () => { stale = true }
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
        events: [...(task.events || [])],
        result: task.result || '',
      })
    } else {
      setForm({ ...EMPTY_TASK, tags: [], events: [] })
    }
    setTagInput('')
    setShowTagDropdown(false)
    setEventsExpanded(false)
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
    const filteredEvents = form.events.filter(ev => ev.content.trim())
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
      events: filteredEvents,
      result: form.status === 'done' ? form.result.trim() : '',
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

  const addEvent = () => {
    const newEvent: TaskEvent = { date: getToday(), content: '' }
    setForm(f => ({ ...f, events: [newEvent, ...f.events] }))
    setEventsExpanded(true)
  }

  const updateEvent = (index: number, field: keyof TaskEvent, value: string) => {
    setForm(f => ({
      ...f,
      events: f.events.map((ev, i) => i === index ? { ...ev, [field]: value } : ev),
    }))
  }

  const removeEvent = (index: number) => {
    setForm(f => ({ ...f, events: f.events.filter((_, i) => i !== index) }))
  }

  const filteredTags = allTags.filter(
    t => !form.tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())
  )

  const showEvents = form.status === 'in_progress' || form.status === 'done'
  const showResult = form.status === 'done'
  const visibleEvents = eventsExpanded ? form.events : form.events.slice(0, 3)
  const hasMoreEvents = form.events.length > 3

  if (!open) return null

  const priorityStyle = PRIORITY_COLORS[form.priority]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e3a5f]/30 backdrop-blur-sm" onWheel={e => e.stopPropagation()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              form.type === 'main' ? 'bg-[#eff6ff] text-[#1e3a5f]' : 'bg-[#fef3c7] text-[#92400e]'
            }`}>
              {form.type === 'main' ? <Target size={20} /> : <Wrench size={20} />}
            </div>
            <h3 className="text-lg font-bold text-[#1e293b]">
              {task ? '编辑任务' : '新建任务'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors">
            <X size={20} className="text-[#94a3b8]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#475569] mb-1.5">任务名称 *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
              placeholder="输入任务名称"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#475569] mb-1.5">需求描述</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc] resize-y min-h-[80px]"
              rows={3}
              placeholder="需求/目标简述，如：验证V3.0字体加载加速功能，对比优化前后加载耗时"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#475569] mb-1.5">任务类型</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as TaskType }))}
                className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
              >
                <option value="main">🎯 主线任务</option>
                <option value="side">🔧 支线任务</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#475569] mb-1.5">
                优先级
                <button
                  type="button"
                  onClick={handleAutoPriority}
                  className="ml-2 inline-flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#1e40af] font-medium"
                >
                  <Sparkles size={12} /> 智能推荐
                </button>
              </label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 outline-none text-sm font-medium transition-colors ${priorityStyle.border} ${priorityStyle.bg} ${priorityStyle.text}`}
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{k} - {v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#475569] mb-1.5">预估时长（分钟）</label>
              <input
                type="number"
                value={form.estimatedMinutes}
                onChange={e => setForm(f => ({ ...f, estimatedMinutes: parseInt(e.target.value) || 30 }))}
                className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
                min={5}
                step={5}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#475569] mb-1.5">截止日期</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
              />
            </div>
          </div>

          {(form.status === 'in_progress' || (task && task.status === 'in_progress')) && (
            <div>
              <label className="block text-sm font-semibold text-[#475569] mb-2">
                任务进度
                <span className={`ml-2 font-bold ${
                  form.progress >= 80 ? 'text-[#10b981]' : form.progress >= 50 ? 'text-[#3b82f6]' : 'text-[#64748b]'
                }`}>{form.progress}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) }))}
                className="w-full h-2 bg-[#e2e8f0] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
              />
              <div className="flex justify-between text-xs text-[#94a3b8] mt-1">
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
              <label className="block text-sm font-semibold text-[#475569] mb-1.5">状态</label>
              <select
                value={form.status}
                onChange={e => {
                  const newStatus = e.target.value as Task['status']
                  setForm(f => ({
                    ...f,
                    status: newStatus,
                    progress: newStatus === 'done' ? 100 : f.progress,
                    blocked: newStatus === 'done' ? false : f.blocked,
                    blockedReason: newStatus === 'done' ? '' : f.blockedReason,
                  }))
                  if (newStatus === 'done') {
                    setTimeout(() => resultInputRef.current?.focus(), 50)
                  }
                }}
                className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
              >
                <option value="todo">⏸️ 待办</option>
                <option value="in_progress">▶️ 进行中</option>
                <option value="done">✅ 已完成</option>
              </select>
            </div>
          )}

          <div className={`border rounded-xl p-4 transition-colors ${
            form.blocked ? 'border-[#fed7aa] bg-[#fff7ed]' : 'border-[#e2e8f0] bg-[#f8fafc]'
          }`}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#475569] cursor-pointer">
                <Ban size={16} className={form.blocked ? 'text-[#f97316]' : 'text-[#94a3b8]'} />
                任务阻塞
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={form.blocked}
                onClick={() => setForm(f => ({ 
                  ...f, 
                  blocked: !f.blocked, 
                  blockedReason: !f.blocked ? (f.blockedReason || '') : '' 
                }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.blocked ? 'bg-[#f97316]' : 'bg-[#cbd5e1]'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.blocked ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            {form.blocked && (
              <div className="mt-3">
                <input
                  type="text"
                  value={form.blockedReason}
                  onChange={e => setForm(f => ({ ...f, blockedReason: e.target.value }))}
                  className="w-full px-4 py-2 border border-[#fed7aa] rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none text-sm bg-white"
                  placeholder="阻塞原因，如：等待开发修复bug、缺少测试账号..."
                  autoFocus
                />
              </div>
            )}
          </div>

          {showEvents && (
            <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
                  <Calendar size={16} className="text-[#3b82f6]" />
                  执行日志
                </label>
                <button
                  type="button"
                  onClick={addEvent}
                  className="inline-flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#1e40af] font-medium"
                >
                  <Plus size={14} /> 添加记录
                </button>
              </div>
              {form.events.length === 0 ? (
                <div className="text-xs text-[#94a3b8] text-center py-3">
                  暂无执行记录，点击"添加记录"开始
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleEvents.map((ev, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                      <input
                        type="date"
                        value={ev.date}
                        onChange={e => updateEvent(index, 'date', e.target.value)}
                        className="shrink-0 w-[130px] px-2 py-1.5 border border-[#e2e8f0] rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-[#3b82f6]"
                      />
                      <div className="w-3 shrink-0 border-t border-dashed border-[#cbd5e1]" />
                      <input
                        type="text"
                        value={ev.content}
                        onChange={e => updateEvent(index, 'content', e.target.value)}
                        maxLength={200}
                        className="flex-1 min-w-0 px-3 py-1.5 border border-[#e2e8f0] rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-[#3b82f6]"
                        placeholder="记录执行情况，如：完成50%用例，发现2个Bug..."
                      />
                      <button
                        type="button"
                        onClick={() => removeEvent(index)}
                        className="shrink-0 p-1 text-[#cbd5e1] hover:text-[#dc2626] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {hasMoreEvents && !eventsExpanded && (
                    <button
                      type="button"
                      onClick={() => setEventsExpanded(true)}
                      className="w-full text-center text-xs text-[#3b82f6] hover:text-[#1e40af] py-1"
                    >
                      查看全部 {form.events.length} 条记录
                    </button>
                  )}
                  {eventsExpanded && hasMoreEvents && form.events.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setEventsExpanded(false)}
                      className="w-full text-center text-xs text-[#94a3b8] hover:text-[#64748b] py-1"
                    >
                      收起
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {showResult && (
            <div className="border border-[#a7f3d0] rounded-xl p-4 bg-[#ecfdf5]">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#065f46] mb-2">
                <CheckCircle2 size={16} className="text-[#10b981]" />
                完成结果
              </label>
              <input
                ref={resultInputRef}
                type="text"
                value={form.result}
                onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                maxLength={200}
                className="w-full px-4 py-2.5 border border-[#a7f3d0] rounded-xl focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] outline-none text-sm bg-white"
                placeholder="简述完成成果，如：发现3个严重Bug，修复率75%，版本已发布"
              />
              <p className="mt-1.5 text-[11px] text-[#6b7280]">用于日报/周报的STAR结果描述</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#475569] mb-1.5">标签</label>
            <div className="flex flex-wrap gap-1.5 p-3 border border-[#e2e8f0] rounded-xl focus-within:ring-2 focus-within:ring-[#3b82f6] focus-within:border-[#3b82f6] bg-[#f8fafc] min-h-[48px]">
              {form.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[#eff6ff] text-[#1e3a5f] rounded-full font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-[#3b82f6] hover:text-[#dc2626] transition-colors"
                  >
                    <X size={12} />
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
                  className="w-full outline-none text-sm border-none p-0 focus:ring-0 bg-transparent"
                  placeholder={form.tags.length === 0 ? '输入或选择标签...' : ''}
                />
                {showTagDropdown && (filteredTags.length > 0 || tagInput.trim()) && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto w-56">
                    {tagInput.trim() && !form.tags.includes(tagInput.trim()) && !allTags.includes(tagInput.trim()) && (
                      <button
                        type="button"
                        onClick={() => addTag(tagInput)}
                        className="w-full text-left px-3 py-2 text-sm text-[#3b82f6] hover:bg-[#eff6ff] flex items-center gap-1.5"
                      >
                        <Plus size={14} /> 创建 "{tagInput.trim()}"
                      </button>
                    )}
                    {filteredTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="w-full text-left px-3 py-2 text-sm text-[#475569] hover:bg-[#f1f5f9]"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {allTags.length > 0 && form.tags.length === 0 && !showTagDropdown && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-[#94a3b8] mr-1">快捷选择:</span>
                {allTags.slice(0, 8).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="px-2 py-0.5 text-xs bg-[#f1f5f9] text-[#64748b] rounded hover:bg-[#eff6ff] hover:text-[#3b82f6] transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold bg-[#1e3a5f] text-white rounded-xl hover:bg-[#1e4976] transition-colors shadow-md"
            >
              {task ? '保存修改' : '创建任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
