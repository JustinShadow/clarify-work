import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import type { DailyReport, WeeklyReport, MonthlyReport } from '../types'

interface Props {
  report: DailyReport | WeeklyReport | MonthlyReport
  type: 'daily' | 'weekly' | 'monthly'
}

export default function ReportCard({ report, type }: Props) {
  const [expanded, setExpanded] = useState(false)

  const getTitle = () => {
    if (type === 'daily') return `日报 - ${(report as DailyReport).date}`
    if (type === 'weekly') return `周报 - ${(report as WeeklyReport).weekStart} ~ ${(report as WeeklyReport).weekEnd}`
    return `月报 - ${(report as MonthlyReport).month}`
  }

  const getStats = () => {
    if (type === 'daily') {
      const dr = report as DailyReport
      return [
        { label: '主线完成', value: dr.completedMain.length },
        { label: '支线完成', value: dr.completedSide.length },
        { label: '进行中', value: dr.inProgress.length },
        { label: '待办', value: dr.todo.length },
      ]
    }
    if (type === 'weekly') {
      const wr = report as WeeklyReport
      return [
        { label: '亮点', value: wr.highlights.length },
        { label: '问题', value: wr.issues.length },
        { label: '日报数', value: wr.dailyReports?.length || 0 },
      ]
    }
    const mr = report as MonthlyReport
    return [
      { label: '亮点', value: mr.highlights.length },
      { label: '问题', value: mr.issues.length },
      { label: '周报数', value: mr.weeklyReports?.length || 0 },
    ]
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <FileText size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{getTitle()}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {getStats().map(s => `${s.label}: ${s.value}`).join(' · ')}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          {type === 'daily' && <DailyReportDetail report={report as DailyReport} />}
          {type === 'weekly' && <WeeklyReportDetail report={report as WeeklyReport} />}
          {type === 'monthly' && <MonthlyReportDetail report={report as MonthlyReport} />}
        </div>
      )}
    </div>
  )
}

function DailyReportDetail({ report }: { report: DailyReport }) {
  return (
    <div className="space-y-3 text-sm">
      <Section title="🎯 主线完成" items={report.completedMain.map(t => t.title)} />
      <Section title="🔧 支线完成" items={report.completedSide.map(t => t.title)} />
      <Section title="⏳ 进行中" items={report.inProgress.map(t => `${t.title} [${t.type === 'main' ? '主线' : '支线'}]`)} />
      <Section title="📋 待办" items={report.todo.map(t => `${t.title} [${t.type === 'main' ? '主线' : '支线'}]`)} />
      <Section title="📅 明日计划" items={report.tomorrowPlan} empty="待规划" />
      <Section title="⚠️ 风险/阻塞" items={report.blockers} empty="无" />
      {report.notes && (
        <div>
          <p className="font-medium text-slate-700 mb-1">📝 补充说明</p>
          <p className="text-slate-600 whitespace-pre-wrap">{report.notes}</p>
        </div>
      )}
    </div>
  )
}

function WeeklyReportDetail({ report }: { report: WeeklyReport }) {
  return (
    <div className="space-y-3 text-sm">
      {report.summary && (
        <div>
          <p className="font-medium text-slate-700 mb-1">概要</p>
          <p className="text-slate-600">{report.summary}</p>
        </div>
      )}
      <Section title="🌟 本周亮点" items={report.highlights} />
      <Section title="⚠️ 问题与风险" items={report.issues} empty="无" />
      <Section title="📅 下周计划" items={report.nextWeekPlan} empty="待规划" />
      {report.dailyReports && report.dailyReports.length > 0 && (
        <div>
          <p className="font-medium text-slate-700 mb-2">每日详情</p>
          {report.dailyReports.map(dr => (
            <div key={dr.date} className="ml-3 mb-2">
              <p className="text-xs font-medium text-slate-500">{dr.date}</p>
              <ul className="text-xs text-slate-600 space-y-0.5 ml-3">
                {[...dr.completedMain, ...dr.completedSide].map(t => (
                  <li key={t.id}>✓ {t.title}</li>
                ))}
                {dr.inProgress.map(t => (
                  <li key={t.id}>○ {t.title} (进行中)</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MonthlyReportDetail({ report }: { report: MonthlyReport }) {
  return (
    <div className="space-y-3 text-sm">
      {report.summary && (
        <div>
          <p className="font-medium text-slate-700 mb-1">概要</p>
          <p className="text-slate-600">{report.summary}</p>
        </div>
      )}
      <Section title="🌟 本月亮点" items={report.highlights} />
      <Section title="⚠️ 问题与风险" items={report.issues} empty="无" />
      <Section title="📅 下月计划" items={report.nextMonthPlan} empty="待规划" />
      {report.weeklyReports && report.weeklyReports.length > 0 && (
        <div>
          <p className="font-medium text-slate-700 mb-2">周报详情</p>
          {report.weeklyReports.map(wr => (
            <div key={wr.weekStart} className="ml-3 mb-2">
              <p className="text-xs font-medium text-slate-500">{wr.weekStart} ~ {wr.weekEnd}</p>
              <ul className="text-xs text-slate-600 space-y-0.5 ml-3">
                {wr.highlights?.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Section({ title, items, empty = '无' }: { title: string; items: string[]; empty?: string }) {
  return (
    <div>
      <p className="font-medium text-slate-700 mb-1">{title}</p>
      {items.length === 0 ? (
        <p className="text-slate-400 text-xs ml-3">{empty}</p>
      ) : (
        <ul className="space-y-0.5 ml-3">
          {items.map((item, i) => (
            <li key={i} className="text-slate-600">{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
