import { useState, useEffect, useCallback } from 'react'
import { weeklyReportApi, llmApi } from '../api'
import type { WeeklyReport } from '../types'
import { getWeekRange } from '../utils/priority'
import Layout from '../components/Layout'
import ReportCard from '../components/ReportCard'
import LLMDialog from '../components/LLMDialog'
import { Sparkles } from 'lucide-react'

export default function WeeklyReports() {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [llmOpen, setLlmOpen] = useState(false)

  const fetchReports = useCallback(async () => {
    try {
      const data = await weeklyReportApi.list()
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

  const handleGenerate = async () => {
    const { start, end } = getWeekRange()
    setGenerating(true)
    try {
      await weeklyReportApi.generate({ weekStart: start, weekEnd: end })
      fetchReports()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const { start, end } = getWeekRange()

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">周报</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setLlmOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium flex items-center gap-1"
            >
              <Sparkles size={14} /> AI 生成周报
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-50"
            >
              {generating ? '生成中...' : '生成本周周报'}
            </button>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-20 text-slate-400">加载中...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p>暂无周报</p>
            <p className="text-sm mt-2">先创建日报，再生成周报汇总</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <ReportCard key={report.weekStart} report={report} type="weekly" />
            ))}
          </div>
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
          setLlmOpen(false)
          fetchReports()
        }}
        onClose={() => setLlmOpen(false)}
        streamFn={(body, onChunk) => llmApi.streamGenerate('/llm/generate-weekly', body, onChunk)}
        streamBody={{ weekStart: start, weekEnd: end }}
      />
    </Layout>
  )
}
