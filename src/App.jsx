import React from 'react'
import Toolbar from './components/Toolbar/Toolbar'
import LeftPanel from './components/Panels/LeftPanel'
import RightPanel from './components/Panels/RightPanel'
import BuilderCanvas from './components/Canvas/BuilderCanvas'
import VenueRenderer from './renderer/VenueRenderer'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useStore } from './store/useStore'
import { themes } from './theme'

export const ThemeContext = React.createContext(themes.dark)

class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 24, color: '#f87171', fontFamily: 'monospace', fontSize: 13 }}>
        <b>Render error:</b> {this.state.error.message}
        <br /><button style={{ marginTop: 12, cursor: 'pointer' }} onClick={() => this.setState({ error: null })}>Dismiss</button>
      </div>
    )
    return this.props.children
  }
}

export default function App() {
  useKeyboardShortcuts()
  const [preview, setPreview] = React.useState(false)
  const exportJSON = useStore(s => s.exportJSON)
  const theme = useStore(s => s.theme)
  const t = themes[theme]

  // Offline banner
  const [online, setOnline] = React.useState(navigator.onLine)
  React.useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Mobile detection
  const isMobile = window.innerWidth < 768

  if (preview) {
    const data = JSON.parse(exportJSON())
    return (
      <ThemeContext.Provider value={t}>
        {!online && <OfflineBanner />}
        <div style={{ height: '100vh', overflowY: 'auto', background: t.appBg }}>
          <div style={{ padding: '12px 24px', background: t.panelBg, borderBottom: `1px solid ${t.panelBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setPreview(false)}
              style={{ background: t.btnBg, border: `1px solid ${t.btnBorder}`, color: t.btnColor, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              ← Back to Builder
            </button>
            <span style={{ color: t.labelColor, fontSize: 13 }}>Preview — {data.venue.name}</span>
          </div>
          <VenueRenderer venueData={data} />
        </div>
      </ThemeContext.Provider>
    )
  }

  if (isMobile) {
    return (
      <ThemeContext.Provider value={t}>
        {!online && <OfflineBanner />}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.appBg, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🖥️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.inputColor, marginBottom: 8 }}>Desktop Required</div>
          <div style={{ fontSize: 14, color: t.labelColor, lineHeight: 1.7, maxWidth: 300, marginBottom: 24 }}>
            The venue builder requires a desktop browser. Open SeatNova on a laptop or desktop to create layouts.
          </div>
          <button onClick={() => setPreview(true)}
            style={{ padding: '10px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            View Preview Instead
          </button>
        </div>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={t}>
      {!online && <OfflineBanner />}
      <Toolbar onPreview={() => setPreview(true)} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftPanel />
        <BuilderCanvas />
        <ErrorBoundary><RightPanel /></ErrorBoundary>
      </div>
    </ThemeContext.Provider>
  )
}

function OfflineBanner() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#b45309', color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      ⚠️ You are offline. Changes are saved locally but won't sync until you reconnect.
    </div>
  )
}
