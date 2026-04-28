import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Sunrise, FileText, Calendar, CalendarDays, SettingsIcon } from 'lucide-react'

const navItems = [
  { path: '/', label: '看板', icon: LayoutDashboard },
  { path: '/plan', label: '晨间规划', icon: Sunrise },
  { path: '/daily', label: '日报', icon: FileText },
  { path: '/weekly', label: '周报', icon: Calendar },
  { path: '/monthly', label: '月报', icon: CalendarDays },
  { path: '/settings', label: '设置', icon: SettingsIcon },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* 顶部导航 - 深海蓝主题 */}
      <nav className="bg-[#1e3a5f] sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <LayoutDashboard size={18} className="text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight">WorkFlow</span>
              </Link>
              
              {/* 导航链接 */}
              <div className="flex gap-1">
                {navItems.map(item => {
                  const Icon = item.icon
                  const active = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-white' : 'text-white/60'} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
