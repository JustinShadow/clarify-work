import { useState, useEffect, useCallback, useMemo } from 'react'
import { weeklyReportApi, llmApi } from '../api'
import type { WeeklyReport } from '../types'
import { getTodayDateStr, getMonthKey, getYearKey, getMonthLabel, formatDateShort, getWeekRange } from '../utils/priority'
import Layout from '../components/Layout'
import ReportGroup from '../components/ReportGroup'
import type { GroupNode } from '../components/ReportGroup'
import LLMDialog from '../components/LLMDialog'
import { Calendar, Sparkles } from 'lucide-react'

function buildWeeklyGroups(reports: WeeklyReport[]): {
  flatItems: { label: string; accentColor: string; items: WeeklyReport[] }
  groups: GroupNode[]
} {
  const currentMonth = getMonthKey(getTodayDateStr())
  const thisMonthReports: WeeklyReport[] = []
  const olderReports: WeeklyReport[] = []

  for (const r of reports) {
    if (getMonthKey(r.weekStart) === currentMonth) {
      thisMonthReports.push(r)
    } else {
      olderReports.push(r)
    }
  }

  const monthMap = new Map<string, WeeklyReport[]>()
  for (const r of olderReports) {
    const mk = getMonthKey(r.weekStart)
    if (!monthMap.has(mk)) monthMap.set(mk, [])
    monthMap.get(mk)!.push(r)
  }

  const yearMap = new Map<string, Map<string, WeeklyReport[]>>()
  for (const [monthKey, monthReports] of monthMap) {
    const yearKey = getYearKey(monthKey)
    if (!yearMap.has(yearKey)) yearMap.set(yearKey, new Map())
    yearMap.get(yearKey)!.set(monthKey, monthReports)
  }

  const groups: GroupNode[] = []
  const sortedYears = [...yearMap.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  for (const [yearKey, months] of sortedYears) {
    const monthGroups: GroupNode[] = []
    const sortedMonths = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]))

    for (const [monthKey, monthReports] of sortedMonths) {
      monthGroups.push({
        key: monthKey,
        label: getMonthLabel(monthKey),
        dateRange: `${formatDateShort(monthReports[monthReports.length - 1].weekStart)} - ${formatDateShort(monthReports[0].weekEnd)}`,
        count: monthReports.length,
        level: 'month',
        items: monthReports,
        defaultExpanded: false,
      })
    }

    const allInYear = [...months.values()].flat()
    groups.push({
      key: yearKey,
      label: `${yearKey}年`,
      count: allInYear.length,
      badge: { text: `${monthGroups.length}月`, color: 'bg-[#dbeafe] text-[#1e40af]' },
      children: monthGroups,
      level: 'year',
      defaultExpanded: getYearKey(getTodayDateStr()) === yearKey,
    })
  }

  return {
    flatItems: {
      label: '本月',
      accentColor: 'bg-[#3b82f6]',
      items: thisMonthReports,
    },
    groups,
  }
}

export default function WeeklyReports() {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [llmOpen, setLlmOpen] = useState(false)

  const fetchReports = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await weeklyReportApi.list()
      if (signal?.aborted) return
      setReports(data)
    } catch (err) {
      if (signal?.aborted) return
      console.error(err)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    fetchReports(ac.signal)
    return () => ac.abort()
  }, [fetchReports])

  const handleDelete = async (report: WeeklyReport) => {
    try {
      await weeklyReportApi.delete(report.weekStart)
      fetchReports()
    } catch (err) { console.error(err) }
  }

  const { flatItems, groups } = useMemo(() => buildWeeklyGroups(reports), [reports])
  const { start, end } = getWeekRange()

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#eff6ff] rounded-xl flex items-center justify-center">
              <Calendar size={24} className="text-[#3b82f6]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1e3a5f]">周报</h1>
              <p className="text-sm text-[#64748b]">每周工作总结与回顾</p>
            </div>
          </div>
          <button
            onClick={() => setLlmOpen(true)}
            className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#1e4976] transition text-sm font-semibold flex items-center gap-2 shadow-md"
          >
            <Sparkles size={16} /> AI 生成周报
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#94a3b8]">
            <div className="w-12 h-12 border-4 border-[#e2e8f0] border-t-[#3b82f6] rounded-full animate-spin mx-auto mb-4"></div>
            加载中...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Calendar size={32} className="text-[#cbd5e1]" />
            </div>
            <p className="text-[#64748b]">暂无周报</p>
          </div>
        ) : (
          <ReportGroup groups={groups} type="weekly" onDelete={handleDelete} flatItems={flatItems} />
        )}
      </div>

      <LLMDialog
        open={llmOpen}
        title="AI 生成周报"
        systemContext=""
        onGenerate={async (content) => {
          try {
            await weeklyReportApi.generate({ weekStart: start, weekEnd: end, llmContent: content })
          } catch (err) { console.error(err) }
          fetchReports()
        }}
        onClose={() => setLlmOpen(false)}
        streamFn={(body, onChunk) => llmApi.streamGenerate('/llm/generate-weekly', body, onChunk)}
        streamBody={{ weekStart: start, weekEnd: end }}
      />
    </Layout>
  )
}
