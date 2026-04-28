import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Board from './pages/Board'
import MorningPlan from './pages/MorningPlan'
import DailyReports from './pages/DailyReports'
import WeeklyReports from './pages/WeeklyReports'
import MonthlyReports from './pages/MonthlyReports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/plan" element={<MorningPlan />} />
        <Route path="/daily" element={<DailyReports />} />
        <Route path="/weekly" element={<WeeklyReports />} />
        <Route path="/monthly" element={<MonthlyReports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}
