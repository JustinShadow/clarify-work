import { useState, useEffect, useCallback } from 'react'
import { monthlyReportApi } from '../api'
import type { MonthlyReport } from '../types'
import { getCurrentMonth } from '../utils/priority'
import Layout from '../components/Layout'
import ReportCard from '../components/ReportCard'

export default function MonthlyReports() {
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

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

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await monthlyReportApi.generate({ month: getCurrentMonth() })
      fetchReports()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">月报</h1>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-50"
          >
            {generating ? '生成中...' : '生成本月月报'}
          </button>
        </div>
        {loading ? (
          <div className="text-center py-20 text-slate-400">加载中...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p>暂无月报</p>
            <p className="text-sm mt-2">先创建周报，再生成月报汇总</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <ReportCard key={report.month} report={report} type="monthly" />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
