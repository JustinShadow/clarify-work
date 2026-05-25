import { useState, useRef, useEffect } from 'react'
import type { MorningPlan } from '../types'
import { getTodayDateStr, getMonthKey, getMonthLabel } from '../utils/priority'
import { ChevronDown } from 'lucide-react'

interface Props {
  plans: MorningPlan[]
  selectedDate: string
  onSelect: (date: string) => void
}

interface MonthGroup {
  key: string
  label: string
  dates: string[]
}

export default function DatePickerDropdown({ plans, selectedDate, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const today = getTodayDateStr()

  const planDates = new Set(plans.map(p => p.date))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { recent, monthGroups } = (() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)

    const recent: string[] = []
    const older: string[] = []

    const d = new Date()
    for (let i = 0; i < 7; i++) {
      const dateStr = d.toISOString().slice(0, 10)
      recent.push(dateStr)
      d.setDate(d.getDate() - 1)
    }

    for (const p of plans) {
      if (p.date < sevenDaysAgoStr && !recent.includes(p.date)) {
        older.push(p.date)
      }
    }

    const uniqueOlder = [...new Set(older)].sort().reverse()

    const monthMap = new Map<string, string[]>()
    for (const date of uniqueOlder) {
      const mk = getMonthKey(date)
      if (!monthMap.has(mk)) monthMap.set(mk, [])
      monthMap.get(mk)!.push(date)
    }

    const monthGroups: MonthGroup[] = [...monthMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, dates]) => ({
        key,
        label: getMonthLabel(key),
        dates,
      }))

    return { recent, monthGroups }
  })()

  const selectedLabel = selectedDate === today
    ? `${selectedDate} (今日)`
    : selectedDate

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-sm focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none bg-[#f8fafc] flex items-center gap-2 min-w-[160px] justify-between"
      >
        <span className="font-medium text-[#1e3a5f]">{selectedLabel}</span>
        <ChevronDown size={14} className={`text-[#94a3b8] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-lg z-50 w-[200px] max-h-[280px] overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] text-[#94a3b8] font-semibold uppercase border-b border-[#f1f5f9]">
            最近7天
          </div>
          {recent.map(date => {
            const hasPlan = planDates.has(date)
            const isToday = date === today
            return (
              <button
                key={date}
                onClick={() => { onSelect(date); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#f8fafc] transition-colors flex items-center justify-between ${
                  date === selectedDate ? 'bg-[#eff6ff] text-[#1e3a5f] font-semibold' : ''
                } ${!hasPlan && !isToday ? 'text-[#94a3b8]' : 'text-[#1e3a5f]'}`}
              >
                <span>{date}{isToday && <span className="text-[#10b981] text-[10px] ml-1">(今日)</span>}</span>
                {!hasPlan && !isToday && <span className="text-[10px] text-[#cbd5e1]">无规划</span>}
              </button>
            )
          })}

          {monthGroups.length > 0 && (
            <>
              {monthGroups.map(group => (
                <div key={group.key}>
                  <div className="px-3 py-1.5 text-[10px] text-[#94a3b8] font-semibold border-t border-[#f1f5f9]">
                    {group.label}
                  </div>
                  {group.dates.slice(0, 5).map(date => {
                    const hasPlan = planDates.has(date)
                    return (
                      <button
                        key={date}
                        onClick={() => { onSelect(date); setOpen(false) }}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#f8fafc] transition-colors flex items-center justify-between ${
                          date === selectedDate ? 'bg-[#eff6ff] text-[#1e3a5f] font-semibold' : ''
                        } ${!hasPlan ? 'text-[#94a3b8]' : 'text-[#1e3a5f]'}`}
                      >
                        <span>{date}</span>
                        {!hasPlan && <span className="text-[10px] text-[#cbd5e1]">无规划</span>}
                      </button>
                    )
                  })}
                  {group.dates.length > 5 && (
                    <div className="px-3 py-1 text-[10px] text-[#cbd5e1] text-center">...还有{group.dates.length - 5}项</div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
