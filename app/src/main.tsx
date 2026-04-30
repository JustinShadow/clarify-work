import 'tailwindcss'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initAPI } from '@shared/api'
import '@shared/index.css'
import App from '@shared/App'

initAPI().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode><App /></StrictMode>,
  )
})