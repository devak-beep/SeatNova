import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useThemePreference } from '../hooks/useThemePreference'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [theme, toggleTheme] = useThemePreference()
  const navigate = useNavigate()
  const s = getStyles(theme)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false) }
    else navigate('/')
  }

  return (
    <div style={s.page}>
      <button onClick={toggleTheme} style={s.themeBtn} title="Toggle theme">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div style={s.card}>
        <Logo />
        <h2 style={s.title}>Welcome back</h2>
        <form onSubmit={handle} style={s.form}>
          <input style={s.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={s.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p style={s.error}>{error}</p>}
          <button style={s.btn} disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
        <p style={s.link}>Don't have an account? <Link to="/register" style={s.a}>Sign Up</Link></p>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
      <svg width="36" height="36" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="36" stroke="url(#lg)" strokeWidth="3" />
        <rect x="27" y="32" width="26" height="16" rx="2" fill="url(#lg)" opacity="0.3" />
        <circle cx="40" cy="13" r="3" fill="url(#lg)" />
        <circle cx="67" cy="40" r="3" fill="url(#lg)" />
        <circle cx="40" cy="67" r="3" fill="url(#lg)" />
        <circle cx="13" cy="40" r="3" fill="url(#lg)" />
        <defs><linearGradient id="lg" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#a855f7"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
      </svg>
      <span style={{ fontSize: 22, fontWeight: 800, color: '#a855f7' }}>SeatNova</span>
    </div>
  )
}

function getStyles(theme) {
  const dark = theme === 'dark'
  return {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: dark ? '#0f0f13' : '#f1f5f9', position: 'relative' },
    card: { background: dark ? '#1a1a24' : '#ffffff', border: `1px solid ${dark ? '#2a2a3a' : '#e2e8f0'}`, borderRadius: 16, padding: '40px 36px', width: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.15)' },
    title: { margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: dark ? '#f1f1f5' : '#0f172a' },
    form: { display: 'flex', flexDirection: 'column', gap: 14 },
    input: { padding: '11px 14px', borderRadius: 8, border: `1px solid ${dark ? '#2a2a3a' : '#e2e8f0'}`, background: dark ? '#111118' : '#f8fafc', color: dark ? '#f1f1f5' : '#0f172a', fontSize: 14, outline: 'none', '--autofill-bg': dark ? '#111118' : '#f8fafc', '--autofill-color': dark ? '#f1f1f5' : '#0f172a' },
    btn: { padding: '12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
    error: { margin: 0, fontSize: 13, color: '#f87171' },
    link: { marginTop: 20, textAlign: 'center', fontSize: 13, color: dark ? '#6b7280' : '#64748b' },
    a: { color: '#a855f7', textDecoration: 'none', fontWeight: 600 },
    themeBtn: { position: 'absolute', top: 20, right: 20, background: dark ? '#1a1a24' : '#ffffff', border: `1px solid ${dark ? '#2a2a3a' : '#e2e8f0'}`, borderRadius: 8, padding: '6px 10px', fontSize: 18, cursor: 'pointer', lineHeight: 1 },
  }
}
