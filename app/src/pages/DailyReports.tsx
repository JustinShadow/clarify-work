import { useState, useEffect, useCallback } from 'react'
import { dailyReportApi, llmApi } from '../api'
import type { DailyReport } from '../types'
import Layout from '../components/Layout'
import ReportCard from '../components/ReportCard'
import LLMDialog from '../components/LLMDialog'
import { Sparkles } from 'lucide-react'

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

  const today = new Date().toISOString().split('T')[0]

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">日报</h1>
          <button
            onClick={() => setLlmOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium flex items-center gap-1"
          >
            <Sparkles size={14} /> AI 生成日报
          </button>
        </div>
        {loading ? (
          <div className="text-center py-20 text-slate-400">加载中...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p>暂无日报</p>
            <p className="text-sm mt-2">在首页看板中点击"生成日报"创建</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <ReportCard key={report.date} report={report} type="daily" />
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
          setLlmOpen(false)
          fetchReports()
        }}
        onClose={() => setLlmOpen(false)}
        streamFn={(body, onChunk) => llmApi.streamGenerate('/llm/generate-daily', body, onChunk)}
        streamBody={{ date: today }}
      />
    </Layout>
  )
}
