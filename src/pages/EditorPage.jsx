import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadVenue, saveVenue } from '../lib/venueApi'
import { useStore } from '../store/useStore'
import EditorApp from '../EditorApp'

const AUTOSAVE_DELAY = 2000 // ms after last change

export default function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const importJSON = useStore(s => s.importJSON)
  const setTheme = useStore(s => s.toggleTheme)
  const storeTheme = useStore(s => s.theme)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState('saved')

  // Sync localStorage theme → Zustand on mount
  useEffect(() => {
    const saved = localStorage.getItem('seatnova-auth-theme') || 'dark'
    if (saved !== storeTheme) setTheme()
  }, [])

  // Sync Zustand theme → localStorage when changed
  useEffect(() => {
    localStorage.setItem('seatnova-auth-theme', storeTheme)
  }, [storeTheme])

  useEffect(() => {
    loadVenue(id)
      .then(v => {
        importJSON(JSON.stringify({
          venue: { name: v.name, shape: v.shape, field: v.field_type, fieldX: v.field_x, fieldY: v.field_y, fieldScale: v.field_scale, stageX: v.stage_x, stageY: v.stage_y, stageW: v.stage_w, stageH: v.stage_h, canvasSize: v.canvas_size },
          categories: v.categories,
          sections: v.sections,
        }))
        setReady(true)
      })
      .catch(e => setError(e.message))
  }, [id])

  // Autosave: watch store, debounce, save
  useEffect(() => {
    if (!ready) return

    let timer
    const unsub = useStore.subscribe(() => {
      setSaveStatus('unsaved')
      clearTimeout(timer)
      timer = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          await saveVenue(useStore.getState(), id)
          setSaveStatus('saved')
        } catch {
          setSaveStatus('unsaved')
        }
      }, AUTOSAVE_DELAY)
    })

    return () => { unsub(); clearTimeout(timer) }
  }, [ready, id])

  const handleSave = async () => {
    setSaveStatus('saving')
    try { await saveVenue(useStore.getState(), id); setSaveStatus('saved') }
    catch { setSaveStatus('unsaved') }
  }

  if (error) return <div style={{ padding: 40, color: '#f87171', fontFamily: 'monospace' }}>Error: {error}</div>
  if (!ready) return <div style={{ padding: 40, color: '#9ca3af', fontFamily: 'system-ui' }}>Loading project…</div>

  return <EditorApp venueId={id} onSave={handleSave} onHome={() => navigate('/')} saveStatus={saveStatus} />
}
