import { useState, useEffect, useCallback, useMemo } from 'react'
import { dailyReportApi, llmApi } from '../api'
import type { DailyReport } from '../types'
import { getTodayDateStr, isThisWeek, getISOWeek, getWeekStartDate, getWeekEndDate, getMonthKey, getYearKey, getMonthLabel, formatDateShort, getISOWeekYear } from '../utils/priority'
import Layout from '../components/Layout'
import ReportGroup from '../components/ReportGroup'
import type { GroupNode } from '../components/ReportGroup'
import LLMDialog from '../components/LLMDialog'
import { FileText, Sparkles } from 'lucide-react'

function buildDailyGroups(reports: DailyReport[]): {
  flatItems: { label: string; accentColor: string; items: DailyReport[] }
  groups: GroupNode[]
} {
  const thisWeekReports: DailyReport[] = []
  const olderReports: DailyReport[] = []

  for (const r of reports) {
    if (isThisWeek(r.date)) {
      thisWeekReports.push(r)
    } else {
      olderReports.push(r)
    }
  }

  const weekMap = new Map<string, DailyReport[]>()
  for (const r of olderReports) {
    const weekYear = getISOWeekYear(r.date)
    const weekNum = getISOWeek(r.date)
    const key = `${weekYear}-W${String(weekNum).padStart(2, '0')}`
    if (!weekMap.has(key)) weekMap.set(key, [])
    weekMap.get(key)!.push(r)
  }

  const monthMap = new Map<string, Map<string, DailyReport[]>>()
  for (const [weekKey, weekReports] of weekMap) {
    const monthKey = getMonthKey(weekReports[0].date)
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map())
    monthMap.get(monthKey)!.set(weekKey, weekReports)
  }

  const yearMap = new Map<string, Map<string, Map<string, DailyReport[]>>>()
  for (const [monthKey, weeks] of monthMap) {
    const yearKey = getYearKey(monthKey)
    if (!yearMap.has(yearKey)) yearMap.set(yearKey, new Map())
    yearMap.get(yearKey)!.set(monthKey, weeks)
  }

  const groups: GroupNode[] = []

  const sortedYears = [...yearMap.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  for (const [yearKey, months] of sortedYears) {
    const monthGroups: GroupNode[] = []

    const sortedMonths = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]))
    for (const [monthKey, weeks] of sortedMonths) {
      const weekGroups: GroupNode[] = []
      const sortedWeeks = [...weeks.entries()].sort((a, b) => b[0].localeCompare(a[0]))

      for (const [weekKey, weekReports] of sortedWeeks) {
        const weekNum = parseInt(weekKey.split('W')[1])
        const firstDate = weekReports[0].date
        weekGroups.push({
          key: weekKey,
          label: `第${weekNum}周`,
          dateRange: `${formatDateShort(getWeekStartDate(firstDate))} - ${formatDateShort(getWeekEndDate(firstDate))}`,
          count: weekReports.length,
          level: 'week',
          items: weekReports,
          defaultExpanded: false,
        })
      }

      const allReportsInMonth = [...weeks.values()].flat()
      monthGroups.push({
        key: monthKey,
        label: getMonthLabel(monthKey),
        dateRange: `${formatDateShort(allReportsInMonth[allReportsInMonth.length - 1].date)} - ${formatDateShort(allReportsInMonth[0].date)}`,
        count: allReportsInMonth.length,
        children: weekGroups,
        level: 'month',
        defaultExpanded: false,
      })
    }

    groups.push({
      key: yearKey,
      label: `${yearKey}年`,
      count: [...months.values()].flatMap(m => [...m.values()].flat()).length,
      children: monthGroups,
      level: 'year',
      defaultExpanded: getYearKey(getTodayDateStr()) === yearKey,
    })
  }

  return {
    flatItems: {
      label: '本周',
      accentColor: 'bg-[#10b981]',
      items: thisWeekReports,
    },
    groups,
  }
}

export default function DailyReports() {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [llmOpen, setLlmOpen] = useState(false)

  const fetchReports = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await dailyReportApi.list()
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

  const handleDelete = async (report: DailyReport) => {
    try {
      await dailyReportApi.delete(report.date)
      fetchReports()
    } catch (err) { console.error(err) }
  }

  const { flatItems, groups } = useMemo(() => buildDailyGroups(reports), [reports])

  const today = getTodayDateStr()

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#ecfdf5] rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-[#10b981]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1e3a5f]">日报</h1>
              <p className="text-sm text-[#64748b]">记录每日工作成果与反思</p>
            </div>
          </div>
          <button
            onClick={() => setLlmOpen(true)}
            className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#1e4976] transition text-sm font-semibold flex items-center gap-2 shadow-md"
          >
            <Sparkles size={16} /> AI 生成日报
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#94a3b8]">
            <div className="w-12 h-12 border-4 border-[#e2e8f0] border-t-[#10b981] rounded-full animate-spin mx-auto mb-4"></div>
            加载中...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <FileText size={32} className="text-[#cbd5e1]" />
            </div>
            <p className="text-[#64748b]">暂无日报</p>
            <p className="text-sm mt-2 text-[#94a3b8]">在首页看板中点击"生成日报"创建</p>
          </div>
        ) : (
          <ReportGroup groups={groups} type="daily" onDelete={handleDelete} flatItems={flatItems} />
        )}
      </div>

      <LLMDialog
        open={llmOpen}
        title="AI 生成日报"
        systemContext=""
        onGenerate={async (content) => {
          try {
            await dailyReportApi.generate({ date: today, llmContent: content })
          } catch (err) { console.error(err) }
          fetchReports()
        }}
        onClose={() => setLlmOpen(false)}
        streamFn={(body, onChunk) => llmApi.streamGenerate('/llm/generate-daily', body, onChunk)}
        streamBody={{ date: today }}
      />
    </Layout>
  )
}
