import { useState } from 'react'

export function useThemePreference() {
  const [theme, setTheme] = useState(() => localStorage.getItem('seatnova-auth-theme') || 'dark')
  const toggle = () => setTheme(t => {
    const next = t === 'dark' ? 'light' : 'dark'
    localStorage.setItem('seatnova-auth-theme', next)
    return next
  })
  return [theme, toggle]
}
