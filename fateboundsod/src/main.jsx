import React from 'react'
import ReactDOM from 'react-dom/client'
import { Suspense, lazy } from 'react'
import '@/index.css'

const App = lazy(() => window.location.pathname === '/multiplayer' ? import('./multiplayer/Multiplayer.jsx') : window.location.pathname === '/' || window.location.pathname === '/practice'
  ? import('./practice/Practice.jsx') : import('./App.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <Suspense fallback={<div style={{ padding: 40, color: 'white', background: '#10121b' }}>Opening Fatebound…</div>}><App /></Suspense>
)
