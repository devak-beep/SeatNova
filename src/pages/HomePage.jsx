import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { loadVenues, saveVenue, deleteVenue, duplicateVenue } from '../lib/venueApi'
import { useAuth } from '../lib/AuthContext'
import { useStore } from '../store/useStore'
import { useThemePreference } from '../hooks/useThemePreference'

export default function HomePage() {
  const user = useAuth()
  const navigate = useNavigate()
  const [theme, toggleTheme] = useThemePreference()
  const dark = theme === 'dark'
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const importJSON = useStore(s => s.importJSON)
  const clearSections = useStore(s => s.clearSections)
  const setVenueName = useStore(s => s.setVenueName)
  const setFieldType = useStore(s => s.setFieldType)

  useEffect(() => {
    loadVenues().then(v => { setVenues(v); setLoading(false) })
  }, [])

  const handleNew = async () => {
    setCreating(true)
    clearSections()
    setVenueName('Untitled Venue')
    setFieldType('none')
    // Save a blank venue to get an ID, then open editor
    const blank = useStore.getState()
    const saved = await saveVenue(blank)
    navigate(`/editor/${saved.id}`)
  }

  const handleOpen = (id) => navigate(`/editor/${id}`)

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await deleteVenue(id)
    setVenues(vs => vs.filter(v => v.id !== id))
  }

  const handleDuplicate = async (e, id) => {
    e.stopPropagation()
    const copy = await duplicateVenue(id)
    setVenues(vs => [copy, ...vs])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <div style={{ minHeight: '100vh', background: dark ? '#0f0f13' : '#f1f5f9', color: dark ? '#f1f1f5' : '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      {/* Navbar */}
      <nav style={{ height: 60, background: dark ? '#1a1a24' : '#ffffff', borderBottom: `1px solid ${dark ? '#2a2a3a' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="url(#nlg)" strokeWidth="3" />
            <rect x="27" y="32" width="26" height="16" rx="2" fill="url(#nlg)" opacity="0.3" />
            <circle cx="40" cy="13" r="3" fill="url(#nlg)" />
            <circle cx="67" cy="40" r="3" fill="url(#nlg)" />
            <circle cx="40" cy="67" r="3" fill="url(#nlg)" />
            <circle cx="13" cy="40" r="3" fill="url(#nlg)" />
            <defs><linearGradient id="nlg" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#a855f7"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
          </svg>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#a855f7' }}>SeatNova</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggleTheme} style={{ background: dark ? '#1a1a24' : '#f1f5f9', border: `1px solid ${dark ? '#2a2a3a' : '#e2e8f0'}`, borderRadius: 8, padding: '6px 10px', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <span style={{ fontSize: 13, color: dark ? '#9ca3af' : '#64748b' }}>👤 {userName}</span>
          <button onClick={handleSignOut} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${dark ? '#2a2a3a' : '#e2e8f0'}`, background: 'transparent', color: dark ? '#9ca3af' : '#64748b', fontSize: 13, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>My Projects</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: dark ? '#6b7280' : '#64748b' }}>Create and manage your venue layouts</p>
          </div>
          <button onClick={handleNew} disabled={creating} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {creating ? 'Creating…' : '+ New Project'}
          </button>
        </div>

        {loading ? (
          <div style={{ color: '#6b7280', fontSize: 14 }}>Loading projects…</div>
        ) : venues.length === 0 ? (
          <EmptyState onCreate={handleNew} creating={creating} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            <NewCard onClick={handleNew} creating={creating} dark={dark} />
            {venues.map(v => (
              <ProjectCard key={v.id} venue={v} onOpen={handleOpen} onDelete={handleDelete} onDuplicate={handleDuplicate} dark={dark} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectCard({ venue, onOpen, onDelete, onDuplicate, dark }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={() => onOpen(venue.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? (dark ? '#22223a' : '#f1f5f9') : (dark ? '#1a1a24' : '#ffffff'), border: `1px solid ${hover ? '#7c3aed' : (dark ? '#2a2a3a' : '#e2e8f0')}`, borderRadius: 12, cursor: 'pointer', overflow: 'hidden', transition: 'all 0.15s' }}
    >
      <div style={{ height: 130, background: dark ? 'linear-gradient(135deg,#1e1030,#2a1a4a)' : 'linear-gradient(135deg,#ede9fe,#ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 80 80" fill="none" opacity="0.4">
          <circle cx="40" cy="40" r="34" stroke="#a855f7" strokeWidth="2" />
          <rect x="27" y="32" width="26" height="16" rx="2" fill="#a855f7" opacity="0.4" />
        </svg>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#f1f1f5' : '#0f172a', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue.name}</div>
        <div style={{ fontSize: 12, color: dark ? '#6b7280' : '#94a3b8' }}>{timeAgo(venue.updated_at)}</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={(e) => onDuplicate(e, venue.id)} style={{ padding: '4px 10px', borderRadius: 5, border: `1px solid ${dark ? '#2a2a3a' : '#e2e8f0'}`, background: 'transparent', color: dark ? '#9ca3af' : '#64748b', fontSize: 12, cursor: 'pointer' }} title="Duplicate">⧉ Duplicate</button>
          <button onClick={(e) => onDelete(e, venue.id)} style={{ padding: '4px 10px', borderRadius: 5, border: `1px solid ${dark ? '#3a1a1a' : '#fecaca'}`, background: 'transparent', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function NewCard({ onClick, creating, dark }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? (dark ? '#1e1030' : '#faf5ff') : 'transparent', border: `2px dashed ${hover ? '#a855f7' : (dark ? '#2a2a3a' : '#e2e8f0')}`, borderRadius: 12, cursor: 'pointer', height: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.15s' }}
    >
      <div style={{ fontSize: 32, color: hover ? '#a855f7' : (dark ? '#3a3a4a' : '#cbd5e1') }}>+</div>
      <div style={{ fontSize: 13, color: hover ? '#a855f7' : (dark ? '#6b7280' : '#94a3b8'), fontWeight: 600 }}>{creating ? 'Creating…' : 'New Project'}</div>
    </div>
  )
}

function EmptyState({ onCreate, creating }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🏟️</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f1f5', marginBottom: 8 }}>No projects yet</div>
      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>Create your first venue layout to get started</div>
      <button onClick={onCreate} disabled={creating} style={{ padding: '11px 28px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        {creating ? 'Creating…' : '+ New Project'}
      </button>
    </div>
  )
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
