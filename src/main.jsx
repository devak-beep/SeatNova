import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { useStore } from './store/useStore.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

// ── window.SeatNova public API ────────────────────────────────────────────
// Allows external systems to integrate with the venue builder/renderer.
//
// Usage examples:
//   SeatNova.getLayout()                    → full venue JSON object
//   SeatNova.getSections()                  → array of section objects
//   SeatNova.getSection('section-id')       → single section object
//   SeatNova.lockSection('section-id')      → set status = 'reserved'
//   SeatNova.unlockSection('section-id')    → set status = 'available'
//   SeatNova.setSectionStatus(id, status)   → 'available'|'sold'|'reserved'|'hidden'
//   SeatNova.setSectionPrice(id, price)     → update price
//   SeatNova.onSectionStatusChange(cb)      → subscribe to status changes
//   SeatNova.importLayout(jsonString)       → load a layout
//   SeatNova.exportLayout()                 → get layout as JSON string

const _statusListeners = []

// Subscribe to store and fire listeners on section status changes
let _prevSections = []
useStore.subscribe(state => {
  const changed = state.sections.filter(s => {
    const prev = _prevSections.find(p => p.id === s.id)
    return prev && prev.status !== s.status
  })
  changed.forEach(s => _statusListeners.forEach(cb => cb(s.id, s.status)))
  _prevSections = state.sections
})

window.SeatNova = {
  getLayout() {
    return JSON.parse(useStore.getState().exportJSON())
  },

  getSections() {
    return useStore.getState().sections
  },

  getSection(id) {
    return useStore.getState().sections.find(s => s.id === id) ?? null
  },

  lockSection(id) {
    this.setSectionStatus(id, 'reserved')
  },

  unlockSection(id) {
    this.setSectionStatus(id, 'available')
  },

  setSectionStatus(id, status) {
    const valid = ['available', 'sold', 'reserved', 'hidden']
    if (!valid.includes(status)) throw new Error(`Invalid status. Use: ${valid.join(', ')}`)
    useStore.getState().updateSection(id, { status })
  },

  setSectionPrice(id, price) {
    if (typeof price !== 'number' || price < 0) throw new Error('Price must be a non-negative number')
    useStore.getState().updateSection(id, { price })
  },

  onSectionStatusChange(callback) {
    _statusListeners.push(callback)
    // Return unsubscribe function
    return () => {
      const i = _statusListeners.indexOf(callback)
      if (i > -1) _statusListeners.splice(i, 1)
    }
  },

  importLayout(jsonString) {
    useStore.getState().importJSON(jsonString)
  },

  exportLayout() {
    return useStore.getState().exportJSON()
  },
}
