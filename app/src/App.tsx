import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Board from './pages/Board'
import DailyReports from './pages/DailyReports'
import WeeklyReports from './pages/WeeklyReports'
import MonthlyReports from './pages/MonthlyReports'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/daily" element={<DailyReports />} />
        <Route path="/weekly" element={<WeeklyReports />} />
        <Route path="/monthly" element={<MonthlyReports />} />
      </Routes>
    </BrowserRouter>
  )
}
