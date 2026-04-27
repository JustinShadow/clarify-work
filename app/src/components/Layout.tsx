import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Calendar, CalendarDays } from 'lucide-react'

const navItems = [
  { path: '/', label: '看板', icon: LayoutDashboard },
  { path: '/daily', label: '日报', icon: FileText },
  { path: '/weekly', label: '周报', icon: Calendar },
  { path: '/monthly', label: '月报', icon: CalendarDays },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link to="/" className="text-lg font-bold text-slate-800 tracking-tight">
                WorkFlow
              </Link>
              <div className="flex gap-1">
                {navItems.map(item => {
                  const Icon = item.icon
                  const active = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        active
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
