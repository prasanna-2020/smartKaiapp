import React, { useState, useEffect } from 'react'
import { store } from './lib/store.js'
import { useToast } from './hooks/useToast.js'
import BuyListScreen from './pages/BuyListScreen.jsx'
import PhonesScreen from './pages/PhonesScreen.jsx'
import LinksScreen from './pages/LinksScreen.jsx'
import ExpensesScreen from './pages/ExpensesScreen.jsx'
import PanchangamScreen from './pages/PanchangamScreen.jsx'

const NAV = [
  { id: 'buy', label: 'Buy List', icon: '🛍' },
  { id: 'phones', label: 'Phones', icon: '📞' },
  { id: 'links', label: 'Links', icon: '🔗' },
  { id: 'expenses', label: 'Expenses', icon: '₹' },
  { id: 'panch', label: 'Calendar', icon: '🪔' },
]

export default function App() {
  const [screen, setScreen] = useState('buy')
  const [isDark, setIsDark] = useState(store.getTheme() === 'dark')
  const { toasts, toast } = useToast()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    store.saveTheme(isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-logo">
          <div className="logo-icon">🛍</div>
          <div className="logo-text">
            <div className="app-name">SmartKai</div>
            <div className="app-sub">UTILITIES · CHENNAI</div>
          </div>
        </div>
        <div className="hdr-btns">
          <button className="icon-btn" onClick={() => setIsDark(d => !d)}>{isDark ? '🌙' : '☀️'}</button>
        </div>
      </header>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {screen === 'buy' && <BuyListScreen toast={toast} />}
        {screen === 'phones' && <PhonesScreen toast={toast} />}
        {screen === 'links' && <LinksScreen toast={toast} />}
        {screen === 'expenses' && <ExpensesScreen toast={toast} />}
        {screen === 'panch' && <PanchangamScreen toast={toast} />}
      </div>
      <nav className="bnav">
        {NAV.map(n => (
          <div key={n.id} className={`bnav-item${screen === n.id ? ' active' : ''}`} onClick={() => setScreen(n.id)}>
            <div className="bnav-pip" />
            <div className="bnav-icon">{n.icon}</div>
            <div className="bnav-lbl">{n.label}</div>
          </div>
        ))}
      </nav>
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
      </div>
    </div>
  )
}
