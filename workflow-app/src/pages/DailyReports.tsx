import { useState, useEffect, useCallback } from 'react'
import { dailyReportApi, llmApi } from '../api'
import type { DailyReport } from '../types'
import Layout from '../components/Layout'
import ReportCard from '../components/ReportCard'
import LLMDialog from '../components/LLMDialog'
import { FileText, Sparkles } from 'lucide-react'

export default function DailyReports() {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [llmOpen, setLlmOpen] = useState(false)

  const fetchReports = useCallback(async () => {
    try {
      const data = await dailyReportApi.list()
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

  const handleDelete = async (report: DailyReport) => {
    try {
      await dailyReportApi.delete((report as DailyReport).date)
      fetchReports()
    } catch (err) { console.error(err) }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面头部 */}
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
          <div className="space-y-4">
            {reports.map(report => (
              <ReportCard key={report.date} report={report} type="daily" onDelete={handleDelete} />
            ))}
          </div>
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
