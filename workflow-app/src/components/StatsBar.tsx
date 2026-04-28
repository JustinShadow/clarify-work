import { Clock, AlertTriangle, CheckCircle2, Target, Loader, Ban, Briefcase } from 'lucide-react'

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
      iconBg: 'bg-[#eff6ff]',
      iconColor: 'text-[#3b82f6]',
      textColor: 'text-[#1e3a5f]',
    },
    {
      label: '进行中',
      value: `${stats.inProgress}`,
      icon: Loader,
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#f59e0b]',
      textColor: 'text-[#92400e]',
    },
    {
      label: '阻塞',
      value: `${stats.blocked}`,
      icon: Ban,
      iconBg: stats.blocked > 0 ? 'bg-[#fff7ed]' : 'bg-[#f1f5f9]',
      iconColor: stats.blocked > 0 ? 'text-[#f97316]' : 'text-[#94a3b8]',
      textColor: stats.blocked > 0 ? 'text-[#c2410c]' : 'text-[#64748b]',
    },
    {
      label: '已完成',
      value: `${stats.completedToday}`,
      icon: CheckCircle2,
      iconBg: 'bg-[#ecfdf5]',
      iconColor: 'text-[#10b981]',
      textColor: 'text-[#047857]',
    },
    {
      label: '预估工时',
      value: overCapacity ? `${hours}h${mins > 0 ? mins + 'm' : ''}` : `${hours}h${mins > 0 ? mins + 'm' : ''}`,
      icon: Clock,
      iconBg: overCapacity ? 'bg-[#fee2e2]' : 'bg-[#ede9fe]',
      iconColor: overCapacity ? 'text-[#dc2626]' : 'text-[#6366f1]',
      textColor: overCapacity ? 'text-[#dc2626]' : 'text-[#1e3a5f]',
      warning: overCapacity,
    },
    {
      label: '逾期',
      value: `${stats.overdueCount}`,
      icon: AlertTriangle,
      iconBg: stats.overdueCount > 0 ? 'bg-[#fee2e2]' : 'bg-[#f1f5f9]',
      iconColor: stats.overdueCount > 0 ? 'text-[#dc2626]' : 'text-[#94a3b8]',
      textColor: stats.overdueCount > 0 ? 'text-[#dc2626]' : 'text-[#64748b]',
    },
  ]

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {items.map(item => {
        const Icon = item.icon
        return (
          <div 
            key={item.label} 
            className={`bg-white rounded-xl border ${item.warning ? 'border-[#fecaca]' : 'border-[#e2e8f0]'} p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className={`p-2 rounded-lg ${item.iconBg} ${item.iconColor}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[#94a3b8] font-medium uppercase tracking-wide">{item.label}</p>
              <p className={`text-lg font-bold ${item.textColor} flex items-center gap-1`}>
                {item.value}
                {item.warning && <span className="text-[#dc2626]">⚠️</span>}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
