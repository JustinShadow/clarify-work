import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Sparkles } from 'lucide-react'
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
        { label: '主线完成', value: dr.completedMain?.length || 0 },
        { label: '支线完成', value: dr.completedSide?.length || 0 },
        { label: '进行中', value: dr.inProgress?.length || 0 },
        { label: '专注度', value: dr.focusScore ? `${dr.focusScore}/5` : '-' },
      ]
    }
    if (type === 'weekly') {
      const wr = report as WeeklyReport
      return [
        { label: '亮点', value: wr.highlights?.length || 0 },
        { label: '问题', value: wr.issues?.length || 0 },
        { label: '日报数', value: wr.dailyReports?.length || 0 },
      ]
    }
    const mr = report as MonthlyReport
    return [
      { label: '亮点', value: mr.highlights?.length || 0 },
      { label: '问题', value: mr.issues?.length || 0 },
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
      {report.inbox && report.inbox.length > 0 && (
        <Section title="📥 Inbox - 今日新增" items={report.inbox} />
      )}
      <Section title="✅ 主线完成" items={(report.completedMain || []).map(t => t.title)} />
      <Section title="✅ 支线完成" items={(report.completedSide || []).map(t => t.title)} />
      <Section title="⏳ 进行中" items={(report.inProgress || []).map(t => `${t.title} [${t.type === 'main' ? '主线' : '支线'}] ${t.progress}%${t.blocked ? ' ⛔' : ''}`)} />
      <Section title="📋 待办" items={(report.todo || []).map(t => `${t.title} [${t.type === 'main' ? '主线' : '支线'}]`)} />
      <Section title="⏳ Waiting - 阻塞/依赖" items={report.blockers || []} empty="无" />
      <Section title="📅 明日计划" items={report.tomorrowPlan || []} empty="待规划" />
      {(report.focusScore || report.deviationAnalysis || report.improvementMeasures) && (
        <div>
          <p className="font-medium text-slate-700 mb-1">🔍 PDCA 复盘</p>
          <div className="ml-3 space-y-1 text-xs">
            {report.focusScore && <p className="text-slate-600">专注度: {report.focusScore}/5</p>}
            {report.deviationAnalysis && <p className="text-slate-600">偏差分析: {report.deviationAnalysis}</p>}
            {report.improvementMeasures && <p className="text-slate-600">改进措施: {report.improvementMeasures}</p>}
          </div>
        </div>
      )}
      {report.llmContent && (
        <div>
          <p className="font-medium text-purple-700 mb-1 flex items-center gap-1"><Sparkles size={12} /> AI 辅助内容</p>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap ml-3 bg-purple-50 p-2 rounded-lg max-h-40 overflow-y-auto">{report.llmContent}</pre>
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
      {report.starAchievements && report.starAchievements.length > 0 && (
        <div>
          <p className="font-medium text-slate-700 mb-2">✅ 关键成果 (STAR)</p>
          {report.starAchievements.map((s, i) => (
            <div key={i} className="ml-3 mb-2 bg-emerald-50 rounded-lg p-2">
              <p className="font-medium text-emerald-800 text-xs">{s.title}</p>
              {s.situation && <p className="text-xs text-slate-600 mt-1"><strong>S:</strong> {s.situation}</p>}
              {s.task && <p className="text-xs text-slate-600"><strong>T:</strong> {s.task}</p>}
              {s.action && <p className="text-xs text-slate-600"><strong>A:</strong> {s.action}</p>}
              {s.result && <p className="text-xs text-slate-600"><strong>R:</strong> {s.result}</p>}
            </div>
          ))}
        </div>
      )}
      <Section title="🌟 本周亮点" items={report.highlights || []} />
      <Section title="⚠️ 问题与风险" items={report.issues || []} empty="无" />
      <Section title="📅 下周计划" items={report.nextWeekPlan || []} empty="待规划" />
      {report.deviationAnalysis && (
        <div>
          <p className="font-medium text-slate-700 mb-1">🔍 PDCA 复盘</p>
          <div className="ml-3 space-y-1 text-xs">
            <p className="text-slate-600">偏差分析: {report.deviationAnalysis}</p>
            {report.improvementMeasures && <p className="text-slate-600">改进措施: {report.improvementMeasures}</p>}
          </div>
        </div>
      )}
      {report.llmContent && (
        <div>
          <p className="font-medium text-purple-700 mb-1 flex items-center gap-1"><Sparkles size={12} /> AI 辅助内容</p>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap ml-3 bg-purple-50 p-2 rounded-lg max-h-40 overflow-y-auto">{report.llmContent}</pre>
        </div>
      )}
      {report.dailyReports && report.dailyReports.length > 0 && (
        <div>
          <p className="font-medium text-slate-700 mb-2">每日详情</p>
          {report.dailyReports.map(dr => (
            <div key={dr.date} className="ml-3 mb-2">
              <p className="text-xs font-medium text-slate-500">{dr.date}</p>
              <ul className="text-xs text-slate-600 space-y-0.5 ml-3">
                {[...(dr.completedMain || []), ...(dr.completedSide || [])].map(t => (
                  <li key={t.id}>✓ {t.title}</li>
                ))}
                {(dr.inProgress || []).map(t => (
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
      {report.starAchievements && report.starAchievements.length > 0 && (
        <div>
          <p className="font-medium text-slate-700 mb-2">📦 测试迭代工作 (STAR)</p>
          {report.starAchievements.map((s, i) => (
            <div key={i} className="ml-3 mb-2 bg-blue-50 rounded-lg p-2">
              <p className="font-medium text-blue-800 text-xs">{s.title}</p>
              {s.situation && <p className="text-xs text-slate-600 mt-1"><strong>S:</strong> {s.situation}</p>}
              {s.task && <p className="text-xs text-slate-600"><strong>T:</strong> {s.task}</p>}
              {s.action && <p className="text-xs text-slate-600"><strong>A:</strong> {s.action}</p>}
              {s.result && <p className="text-xs text-slate-600"><strong>R:</strong> {s.result}</p>}
            </div>
          ))}
        </div>
      )}
      <Section title="🌟 本月亮点" items={report.highlights || []} />
      <Section title="⚠️ 问题与风险" items={report.issues || []} empty="无" />
      <Section title="📅 下月计划" items={report.nextMonthPlan || []} empty="待规划" />
      {report.deviationAnalysis && (
        <div>
          <p className="font-medium text-slate-700 mb-1">🔍 PDCA 复盘</p>
          <div className="ml-3 space-y-1 text-xs">
            <p className="text-slate-600">偏差分析: {report.deviationAnalysis}</p>
            {report.improvementMeasures && <p className="text-slate-600">改进措施: {report.improvementMeasures}</p>}
          </div>
        </div>
      )}
      {report.llmContent && (
        <div>
          <p className="font-medium text-purple-700 mb-1 flex items-center gap-1"><Sparkles size={12} /> AI 辅助内容</p>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap ml-3 bg-purple-50 p-2 rounded-lg max-h-40 overflow-y-auto">{report.llmContent}</pre>
        </div>
      )}
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
