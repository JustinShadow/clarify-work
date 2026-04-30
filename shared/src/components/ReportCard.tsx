import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Trash2 } from 'lucide-react'
import type { DailyReport, WeeklyReport, MonthlyReport } from '../types'
import { MarkdownContent } from '../utils/markdown'

interface Props {
  report: DailyReport | WeeklyReport | MonthlyReport
  type: 'daily' | 'weekly' | 'monthly'
  onDelete?: (report: DailyReport | WeeklyReport | MonthlyReport) => void
}

export default function ReportCard({ report, type, onDelete }: Props) {
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

  const iconCls = type === 'daily' 
    ? 'bg-[#ecfdf5] text-[#10b981]' 
    : type === 'weekly' 
      ? 'bg-[#eff6ff] text-[#3b82f6]' 
      : 'bg-[#fef3c7] text-[#f59e0b]'

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-md transition-shadow">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#f8fafc] transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${iconCls}`}>
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1e293b]">{getTitle()}</h3>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              {getStats().map(s => `${s.label}: ${s.value}`).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('确定删除该报告？此操作不可恢复。')) onDelete(report)
              }}
              className="p-2 text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] rounded-lg transition-colors"
              title="删除报告"
            >
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? <ChevronUp size={18} className="text-[#94a3b8]" /> : <ChevronDown size={18} className="text-[#94a3b8]" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#f1f5f9]">
          {type === 'daily' && <DailyReportDetail report={report as DailyReport} />}
          {type === 'weekly' && <WeeklyReportDetail report={report as WeeklyReport} />}
          {type === 'monthly' && <MonthlyReportDetail report={report as MonthlyReport} />}
        </div>
      )}
    </div>
  )
}

function DailyReportDetail({ report }: { report: DailyReport }) {
  if (report.llmContent) {
    return (
      <div className="px-6 py-5">
        <MarkdownContent content={report.llmContent} theme="emerald" />
      </div>
    )
  }

  return (
    <div className="px-5 pb-5 pt-4 space-y-4 text-sm">
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
          <p className="font-bold text-[#475569] mb-2">🔍 PDCA 复盘</p>
          <div className="ml-3 space-y-1.5 text-xs bg-[#f8fafc] p-3 rounded-lg">
            {report.focusScore && <p className="text-[#64748b]"><span className="font-medium">专注度:</span> {report.focusScore}/5</p>}
            {report.deviationAnalysis && <p className="text-[#64748b]"><span className="font-medium">偏差分析:</span> {report.deviationAnalysis}</p>}
            {report.improvementMeasures && <p className="text-[#64748b]"><span className="font-medium">改进措施:</span> {report.improvementMeasures}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function WeeklyReportDetail({ report }: { report: WeeklyReport }) {
  if (report.llmContent) {
    return (
      <div className="px-6 py-5">
        <MarkdownContent content={report.llmContent} theme="blue" />
      </div>
    )
  }

  return (
    <div className="px-5 pb-5 pt-4 space-y-4 text-sm">
      {report.summary && (
        <div>
          <p className="font-bold text-[#475569] mb-2">概要</p>
          <p className="text-[#64748b] bg-[#f8fafc] p-3 rounded-lg">{report.summary}</p>
        </div>
      )}
      {report.starAchievements && report.starAchievements.length > 0 && (
        <div>
          <p className="font-bold text-[#475569] mb-3">✅ 关键成果 (STAR)</p>
          {report.starAchievements.map((s, i) => (
            <div key={i} className="ml-3 mb-3 bg-[#ecfdf5] rounded-xl p-3 border border-[#a7f3d0]">
              <p className="font-bold text-[#047857] text-xs mb-2">{s.title}</p>
              {s.situation && <p className="text-xs text-[#64748b]"><span className="font-semibold text-[#1e293b]">S:</span> {s.situation}</p>}
              {s.task && <p className="text-xs text-[#64748b]"><span className="font-semibold text-[#1e293b]">T:</span> {s.task}</p>}
              {s.action && <p className="text-xs text-[#64748b]"><span className="font-semibold text-[#1e293b]">A:</span> {s.action}</p>}
              {s.result && <p className="text-xs text-[#64748b]"><span className="font-semibold text-[#1e293b]">R:</span> {s.result}</p>}
            </div>
          ))}
        </div>
      )}
      <Section title="🌟 本周亮点" items={report.highlights || []} />
      <Section title="⚠️ 问题与风险" items={report.issues || []} empty="无" />
      <Section title="📅 下周计划" items={report.nextWeekPlan || []} empty="待规划" />
      {report.deviationAnalysis && (
        <div>
          <p className="font-bold text-[#475569] mb-2">🔍 PDCA 复盘</p>
          <div className="ml-3 space-y-1.5 text-xs bg-[#f8fafc] p-3 rounded-lg">
            <p className="text-[#64748b]"><span className="font-medium">偏差分析:</span> {report.deviationAnalysis}</p>
            {report.improvementMeasures && <p className="text-[#64748b]"><span className="font-medium">改进措施:</span> {report.improvementMeasures}</p>}
          </div>
        </div>
      )}
      {report.dailyReports && report.dailyReports.length > 0 && (
        <div>
          <p className="font-bold text-[#475569] mb-3">每日详情</p>
          {report.dailyReports.map(dr => (
            <div key={dr.date} className="ml-3 mb-3 bg-[#f8fafc] p-3 rounded-lg">
              <p className="text-xs font-bold text-[#1e3a5f] mb-2">{dr.date}</p>
              <ul className="text-xs text-[#64748b] space-y-1 ml-3">
                {[...(dr.completedMain || []), ...(dr.completedSide || [])].map(t => (
                  <li key={t.id} className="flex items-center gap-1">
                    <span className="text-[#10b981]">✓</span> {t.title}
                  </li>
                ))}
                {(dr.inProgress || []).map(t => (
                  <li key={t.id} className="flex items-center gap-1">
                    <span className="text-[#f59e0b]">○</span> {t.title} (进行中)
                  </li>
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
  if (report.llmContent) {
    return (
      <div className="px-6 py-5">
        <MarkdownContent content={report.llmContent} theme="amber" />
      </div>
    )
  }

  return (
    <div className="px-5 pb-5 pt-4 space-y-4 text-sm">
      {report.summary && (
        <div>
          <p className="font-bold text-[#475569] mb-2">概要</p>
          <p className="text-[#64748b] bg-[#f8fafc] p-3 rounded-lg">{report.summary}</p>
        </div>
      )}
      {report.starAchievements && report.starAchievements.length > 0 && (
        <div>
          <p className="font-bold text-[#475569] mb-3">📦 测试迭代工作 (STAR)</p>
          {report.starAchievements.map((s, i) => (
            <div key={i} className="ml-3 mb-3 bg-[#eff6ff] rounded-xl p-3 border border-[#bfdbfe]">
              <p className="font-bold text-[#1e40af] text-xs mb-2">{s.title}</p>
              {s.situation && <p className="text-xs text-[#64748b]"><span className="font-semibold text-[#1e293b]">S:</span> {s.situation}</p>}
              {s.task && <p className="text-xs text-[#64748b]"><span className="font-semibold text-[#1e293b]">T:</span> {s.task}</p>}
              {s.action && <p className="text-xs text-[#64748b]"><span className="font-semibold text-[#1e293b]">A:</span> {s.action}</p>}
              {s.result && <p className="text-xs text-[#64748b]"><span className="font-semibold text-[#1e293b]">R:</span> {s.result}</p>}
            </div>
          ))}
        </div>
      )}
      <Section title="🌟 本月亮点" items={report.highlights || []} />
      <Section title="⚠️ 问题与风险" items={report.issues || []} empty="无" />
      <Section title="📅 下月计划" items={report.nextMonthPlan || []} empty="待规划" />
      {report.deviationAnalysis && (
        <div>
          <p className="font-bold text-[#475569] mb-2">🔍 PDCA 复盘</p>
          <div className="ml-3 space-y-1.5 text-xs bg-[#f8fafc] p-3 rounded-lg">
            <p className="text-[#64748b]"><span className="font-medium">偏差分析:</span> {report.deviationAnalysis}</p>
            {report.improvementMeasures && <p className="text-[#64748b]"><span className="font-medium">改进措施:</span> {report.improvementMeasures}</p>}
          </div>
        </div>
      )}
      {report.weeklyReports && report.weeklyReports.length > 0 && (
        <div>
          <p className="font-bold text-[#475569] mb-3">周报详情</p>
          {report.weeklyReports.map(wr => (
            <div key={wr.weekStart} className="ml-3 mb-3 bg-[#f8fafc] p-3 rounded-lg">
              <p className="text-xs font-bold text-[#1e3a5f] mb-2">{wr.weekStart} ~ {wr.weekEnd}</p>
              <ul className="text-xs text-[#64748b] space-y-1 ml-3">
                {wr.highlights?.map((h, i) => <li key={i} className="flex items-center gap-1"><span className="text-[#f59e0b]">★</span> {h}</li>)}
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
      <p className="font-bold text-[#475569] mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-[#94a3b8] text-xs ml-3">{empty}</p>
      ) : (
        <ul className="space-y-1 ml-3">
          {items.map((item, i) => (
            <li key={i} className="text-[#64748b]">{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}