import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function useKeyboardShortcuts() {
  const { undo, redo, selectedId, duplicateSection, deleteSection } = useStore()

  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey
      // Don't fire when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return

      if (ctrl && e.key === 'z') { e.preventDefault(); undo() }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
      if (ctrl && e.key === 'd') { e.preventDefault(); if (selectedId) duplicateSection(selectedId) }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); deleteSection(selectedId) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, selectedId, duplicateSection, deleteSection])
}
