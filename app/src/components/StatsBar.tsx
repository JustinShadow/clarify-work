import { Clock, AlertTriangle, CheckCircle2, Target, Loader, Ban } from 'lucide-react'

interface Stats {
  total: number
  todo: number
  inProgress: number
  blocked: number
  done: number
  totalEstimatedMinutes: number
  completedToday: number
  overdueCount: number
  mainCount: number
  sideCount: number
}

export default function StatsBar({ stats }: { stats: Stats }) {
  const hours = Math.floor(stats.totalEstimatedMinutes / 60)
  const mins = stats.totalEstimatedMinutes % 60
  const overCapacity = stats.totalEstimatedMinutes > 480

  const items = [
    {
      label: '待办',
      value: `${stats.todo}`,
      icon: Target,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: '进行中',
      value: `${stats.inProgress}`,
      icon: Loader,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: '阻塞',
      value: `${stats.blocked}`,
      icon: Ban,
      color: stats.blocked > 0 ? 'text-orange-600 bg-orange-50' : 'text-slate-400 bg-slate-50',
    },
    {
      label: '已完成',
      value: `${stats.completedToday}`,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: '预估工时',
      value: overCapacity ? `${hours}h${mins > 0 ? mins + 'm' : ''} ⚠️` : `${hours}h${mins > 0 ? mins + 'm' : ''}`,
      icon: Clock,
      color: overCapacity ? 'text-red-600 bg-red-50' : 'text-purple-600 bg-purple-50',
    },
    {
      label: '逾期',
      value: `${stats.overdueCount}`,
      icon: AlertTriangle,
      color: stats.overdueCount > 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-50',
    },
  ]

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {items.map(item => {
        const Icon = item.icon
        return (
          <div key={item.label} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3">
            <div className={`p-2 rounded-md ${item.color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="text-lg font-semibold text-slate-800">{item.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
