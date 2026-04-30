import type { Task, TaskPriority, TaskType } from '../types'

interface PriorityScore {
  score: number
  reason: string
}

export function calculatePriority(task: Task): PriorityScore {
  let score = 0
  const reasons: string[] = []

  const priorityWeights: Record<TaskPriority, number> = {
    P0: 100,
    P1: 70,
    P2: 40,
    P3: 10,
  }
  score += priorityWeights[task.priority]
  if (task.priority === 'P0') reasons.push('紧急任务')

  const typeWeights: Record<TaskType, number> = {
    main: 20,
    side: 5,
  }
  score += typeWeights[task.type]
  if (task.type === 'main') reasons.push('主线任务')

  if (task.deadline) {
    const now = new Date()
    const deadline = new Date(task.deadline)
    const daysUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    if (daysUntilDeadline < 0) {
      score += 50
      reasons.push('已逾期')
    } else if (daysUntilDeadline < 1) {
      score += 40
      reasons.push('今日截止')
    } else if (daysUntilDeadline < 3) {
      score += 25
      reasons.push('3天内截止')
    } else if (daysUntilDeadline < 7) {
      score += 10
    }
  }

  if (task.estimatedMinutes <= 30 && task.priority !== 'P0') {
    score += 8
    reasons.push('快速任务')
  }

  if (task.status === 'in_progress') {
    score += 15
    reasons.push('进行中')
  }

  return {
    score,
    reason: reasons.join(' · '),
  }
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aScore = calculatePriority(a).score
    const bScore = calculatePriority(b).score
    return bScore - aScore
  })
}

export function suggestPriority(task: Partial<Task>): TaskPriority {
  if (task.deadline) {
    const now = new Date()
    const deadline = new Date(task.deadline)
    const daysUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntilDeadline < 0 || daysUntilDeadline < 1) return 'P0'
    if (daysUntilDeadline < 3) return 'P1'
  }
  if (task.type === 'main') return 'P1'
  if (task.type === 'side' && task.estimatedMinutes && task.estimatedMinutes <= 30) return 'P2'
  return 'P2'
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

export function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === 'done') return false
  return new Date(task.deadline) < new Date(getTodayDateStr())
}

export function getDaysUntilDeadline(deadline: string): number {
  const now = new Date(getTodayDateStr())
  const dl = new Date(deadline)
  return Math.floor((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getTodayDateStr(): string {
  return formatDateStr(new Date())
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return {
    start: formatDateStr(monday),
    end: formatDateStr(friday),
  }
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}