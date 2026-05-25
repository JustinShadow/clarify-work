import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import ReportCard from './ReportCard'
import type { DailyReport, WeeklyReport, MonthlyReport } from '../types'

export interface GroupNode {
  key: string
  label: string
  dateRange?: string
  count: number
  badge?: { text: string; color: string }
  children?: GroupNode[]
  items?: DailyReport[] | WeeklyReport[] | MonthlyReport[]
  level: 'year' | 'month' | 'week' | 'flat'
  defaultExpanded?: boolean
}

interface Props {
  groups: GroupNode[]
  type: 'daily' | 'weekly' | 'monthly'
  onDelete?: (report: DailyReport | WeeklyReport | MonthlyReport) => void
  flatItems?: {
    label: string
    accentColor: string
    items: DailyReport[] | WeeklyReport[] | MonthlyReport[]
  }
}

function GroupSection({ group, type, onDelete, depth = 0 }: {
  group: GroupNode
  type: 'daily' | 'weekly' | 'monthly'
  onDelete?: (report: DailyReport | WeeklyReport | MonthlyReport) => void
  depth?: number
}) {
  const storageKey = `report-group-expanded-${group.key}`
  const [expanded, setExpanded] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    return stored !== null ? stored === 'true' : !!group.defaultExpanded
  })

  useEffect(() => {
    localStorage.setItem(storageKey, String(expanded))
  }, [expanded, storageKey])

  const getLevelStyles = () => {
    if (group.level === 'year') return 'border-2 border-[#1e3a5f] bg-[#f8fafc] rounded-xl'
    if (group.level === 'month') return 'border border-[#bfdbfe] bg-[#eff6ff] rounded-xl'
    if (group.level === 'week') return 'border border-[#e2e8f0] bg-white rounded-xl'
    return 'border border-[#e2e8f0] bg-white rounded-xl'
  }

  const getHeaderStyles = () => {
    if (group.level === 'year') return 'px-3.5 py-2.5'
    if (group.level === 'month') return 'px-3 py-2 bg-[#eff6ff]'
    return 'px-3 py-2 bg-[#f8fafc]'
  }

  const getBarColor = () => {
    if (group.level === 'year') return 'bg-[#1e3a5f]'
    if (group.level === 'month') return 'bg-[#1e3a5f]'
    return 'bg-[#3b82f6]'
  }

  const getBadgeStyle = () => {
    if (group.level === 'year') return 'bg-[#dbeafe] text-[#1e40af]'
    if (group.level === 'month') return 'bg-[#dbeafe] text-[#1e40af]'
    return 'bg-[#eff6ff] text-[#1e40af]'
  }

  const Chevron = expanded ? ChevronDown : ChevronRight
  const chevronColor = group.level === 'year' ? 'text-[#1e3a5f]' : group.level === 'month' ? 'text-[#1e40af]' : 'text-[#94a3b8]'

  return (
    <div className={`overflow-hidden mb-2 ${getLevelStyles()}`}>
      <div
        className={`flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors ${getHeaderStyles()}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Chevron size={14} className={chevronColor} />
          <div className={`w-1 h-3.5 rounded-sm ${getBarColor()}`} />
          <strong className={`text-sm ${group.level === 'year' ? 'text-[#1e3a5f]' : 'text-[#1e3a5f]'}`}>
            {group.label}
          </strong>
          {group.dateRange && (
            <span className="text-[10px] text-[#64748b]">{group.dateRange}</span>
          )}
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${getBadgeStyle()}`}>
            {group.count}项
          </span>
          {group.badge && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${group.badge.color}`}>
              {group.badge.text}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1">
          {group.children && group.children.length > 0 && (
            <div className="space-y-2">
              {group.children.map(child => (
                <GroupSection key={child.key} group={child} type={type} onDelete={onDelete} depth={depth + 1} />
              ))}
            </div>
          )}
          {group.items && group.items.length > 0 && (
            <div className="space-y-3 mt-1">
              {group.items.map((report: any) => (
                <ReportCard key={report.date || report.weekStart || report.month} report={report} type={type} onDelete={onDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReportGroup({ groups, type, onDelete, flatItems }: Props) {
  return (
    <div className="space-y-4">
      {flatItems && flatItems.items.length > 0 && (
        <div>
          <div className="flex items-center gap-2 py-1.5 mb-2">
            <div className={`w-1 h-4 rounded-sm ${flatItems.accentColor}`} />
            <strong className="text-sm text-[#1e3a5f]">{flatItems.label}</strong>
          </div>
          <div className="space-y-3">
            {flatItems.items.map((report: any) => (
              <ReportCard key={report.date || report.weekStart || report.month} report={report} type={type} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {groups.map(group => (
        <GroupSection key={group.key} group={group} type={type} onDelete={onDelete} />
      ))}
    </div>
  )
}
