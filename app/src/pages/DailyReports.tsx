import { useState, useEffect, useCallback } from 'react'
import { dailyReportApi } from '../api'
import type { DailyReport } from '../types'
import Layout from '../components/Layout'
import ReportCard from '../components/ReportCard'

export default function DailyReports() {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">日报</h1>
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
    </Layout>
  )
}
