import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { ThemeProvider } from './components/ThemeProvider'
import './styles/app.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="rijal-cms-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
