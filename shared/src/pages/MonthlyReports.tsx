import { useState, useEffect, useCallback } from 'react'
import { monthlyReportApi, llmApi } from '../api'
import type { MonthlyReport } from '../types'
import { getCurrentMonth } from '../utils/priority'
import Layout from '../components/Layout'
import ReportCard from '../components/ReportCard'
import LLMDialog from '../components/LLMDialog'
import { CalendarDays, Sparkles } from 'lucide-react'

export default function MonthlyReports() {
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [llmOpen, setLlmOpen] = useState(false)

  const fetchReports = useCallback(async () => {
    try {
      const data = await monthlyReportApi.list()
      setReports(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleDelete = async (report: MonthlyReport) => {
    try {
      await monthlyReportApi.delete(report.month)
      fetchReports()
    } catch (err) { console.error(err) }
  }

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
              <p className="text-sm text-[#64748b]">总结月度成果与下月规划</p>
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
            <p className="text-sm mt-2 text-[#94a3b8]">先创建周报，再生成月报汇总</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <ReportCard key={report.month} report={report} type="monthly" onDelete={handleDelete} />
            ))}
          </div>
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