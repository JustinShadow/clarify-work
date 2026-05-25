import { useState, useEffect, useCallback, useMemo } from 'react'
import { monthlyReportApi, llmApi } from '../api'
import type { MonthlyReport } from '../types'
import { getTodayDateStr, getYearKey, getCurrentMonth } from '../utils/priority'
import Layout from '../components/Layout'
import ReportGroup from '../components/ReportGroup'
import type { GroupNode } from '../components/ReportGroup'
import LLMDialog from '../components/LLMDialog'
import { CalendarDays, Sparkles } from 'lucide-react'

function buildMonthlyGroups(reports: MonthlyReport[]): {
  flatItems: { label: string; accentColor: string; items: MonthlyReport[] }
  groups: GroupNode[]
} {
  const currentYear = getYearKey(getTodayDateStr())
  const thisYearReports: MonthlyReport[] = []
  const olderReports: MonthlyReport[] = []

  for (const r of reports) {
    if (getYearKey(r.month) === currentYear) {
      thisYearReports.push(r)
    } else {
      olderReports.push(r)
    }
  }

  const yearMap = new Map<string, MonthlyReport[]>()
  for (const r of olderReports) {
    const yk = getYearKey(r.month)
    if (!yearMap.has(yk)) yearMap.set(yk, [])
    yearMap.get(yk)!.push(r)
  }

  const groups: GroupNode[] = []
  const sortedYears = [...yearMap.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  for (const [yearKey, yearReports] of sortedYears) {
    groups.push({
      key: yearKey,
      label: `${yearKey}年`,
      count: yearReports.length,
      badge: { text: `${yearReports.length}篇`, color: 'bg-[#dbeafe] text-[#1e40af]' },
      level: 'year',
      items: yearReports,
      defaultExpanded: false,
    })
  }

  return {
    flatItems: {
      label: '本年',
      accentColor: 'bg-[#f59e0b]',
      items: thisYearReports,
    },
    groups,
  }
}

export default function MonthlyReports() {
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [llmOpen, setLlmOpen] = useState(false)

  const fetchReports = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await monthlyReportApi.list()
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

  const handleDelete = async (report: MonthlyReport) => {
    try {
      await monthlyReportApi.delete(report.month)
      fetchReports()
    } catch (err) { console.error(err) }
  }

  const { flatItems, groups } = useMemo(() => buildMonthlyGroups(reports), [reports])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#fef3c7] rounded-xl flex items-center justify-center">
              <CalendarDays size={24} className="text-[#f59e0b]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1e3a5f]">月报</h1>
              <p className="text-sm text-[#64748b]">月度工作总结与规划</p>
            </div>
          </div>
          <button
            onClick={() => setLlmOpen(true)}
            className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#1e4976] transition text-sm font-semibold flex items-center gap-2 shadow-md"
          >
            <Sparkles size={16} /> AI 生成月报
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#94a3b8]">
            <div className="w-12 h-12 border-4 border-[#e2e8f0] border-t-[#f59e0b] rounded-full animate-spin mx-auto mb-4"></div>
            加载中...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <CalendarDays size={32} className="text-[#cbd5e1]" />
            </div>
            <p className="text-[#64748b]">暂无月报</p>
          </div>
        ) : (
          <ReportGroup groups={groups} type="monthly" onDelete={handleDelete} flatItems={flatItems} />
        )}
      </div>

      <LLMDialog
        open={llmOpen}
        title="AI 生成月报"
        systemContext=""
        onGenerate={async (content) => {
          try {
            await monthlyReportApi.generate({ month: getCurrentMonth(), llmContent: content })
          } catch (err) { console.error(err) }
          fetchReports()
        }}
        onClose={() => setLlmOpen(false)}
        streamFn={(body, onChunk) => llmApi.streamGenerate('/llm/generate-monthly', body, onChunk)}
        streamBody={{ month: getCurrentMonth() }}
      />
    </Layout>
  )
}
