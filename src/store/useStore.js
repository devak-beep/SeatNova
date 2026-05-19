import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from './nanoid'

const CATEGORIES = [
  { id: 'premium', label: 'Premium', color: '#f59e0b' },
  { id: 'gold',    label: 'Gold',    color: '#a78bfa' },
  { id: 'silver',  label: 'Silver',  color: '#60a5fa' },
  { id: 'general', label: 'General', color: '#94a3b8' },
]

const INIT_SECTIONS = []

// Only sections are tracked in history (the meaningful undoable state)
const MAX_HISTORY = 50

function snapshot(sections) {
  return JSON.parse(JSON.stringify(sections))
}

export const useStore = create(persist((set, get) => ({
  venueName: 'My Venue',
  venueShape: 'circular',
  fieldType: 'cricket',
  fieldX: 500,
  fieldY: 500,
  fieldScale: 1,
  stageX: 500,
  stageY: 500,
  stageW: 260,
  stageH: 120,
  stageLocked: false,
  canvasSize: 1000,
  floorPlanImage: null,  // base64 data URL
  floorPlanOpacity: 0.35,
  floorPlanX: 0,
  floorPlanY: 0,
  floorPlanW: null,  // null = full canvas size
  floorPlanH: null,
  floorPlanLocked: false,

  categories: CATEGORIES,
  sections: INIT_SECTIONS,

  // Undo/redo stacks (arrays of sections snapshots)
  past: [],
  future: [],

  tool: 'select',
  selectedId: null,
  selectedIds: [],
  selectedRowIdx: null,
  selectedRowIdxs: [],
  rowSelectMode: false,
  blockRowMode: false,
  fieldSelected: false,
  drawingState: null,

  theme: 'dark',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  // ── helpers ───────────────────────────────────────────────────────────────
  _pushHistory: () => {
    const { sections, past } = get()
    const newPast = [...past, snapshot(sections)]
    if (newPast.length > MAX_HISTORY) newPast.shift()
    set({ past: newPast, future: [] })
  },

  // ── venue ─────────────────────────────────────────────────────────────────
  setVenueName:  (name)  => set({ venueName: name }),
  setVenueShape: (shape) => set({ venueShape: shape }),
  stageLocked: false,
  toggleStageLock: () => set(s => ({ stageLocked: !s.stageLocked })),

  setFieldType:  (type)  => set({ fieldType: type }),
  setFieldPos:   (x, y)  => set({ stageX: x, stageY: y }),
  setFieldScale: (s)     => set({ fieldScale: Math.max(0.1, s) }),
  setStageSize:  (w, h)  => set({ stageW: Math.max(40, w), stageH: Math.max(20, h) }),
  setFloorPlan:  (url)   => set((s) => ({ floorPlanImage: url, floorPlanX: 0, floorPlanY: 0, floorPlanW: s.canvasSize || 1000, floorPlanH: s.canvasSize || 1000, floorPlanLocked: false })),
  setFloorPlanOpacity: (v) => set({ floorPlanOpacity: v }),
  setFloorPlanTransform: (x, y, w, h) => set({ floorPlanX: x, floorPlanY: y, floorPlanW: w, floorPlanH: h }),
  toggleFloorPlanLock: () => set(s => ({ floorPlanLocked: !s.floorPlanLocked })),
  setCanvasSize: (size)  => {
    const s = Math.max(1000, Math.min(100000, size))
    set({ canvasSize: s, fieldX: s / 2, fieldY: s / 2, stageX: s / 2, stageY: s / 2 })
  },

  // ── tool / selection ──────────────────────────────────────────────────────
  setTool:       (tool)  => set({ tool, selectedId: null, selectedIds: [], selectedRowIdx: null, selectedRowIdxs: [], rowSelectMode: false, blockRowMode: false, fieldSelected: false, drawingState: null }),
  selectSection: (id)    => set(s => ({ selectedId: id, selectedIds: [], selectedRowIdx: null, selectedRowIdxs: [], rowSelectMode: s.selectedId === id ? s.rowSelectMode : false, blockRowMode: s.selectedId === id ? s.blockRowMode : false, fieldSelected: false })),
  toggleSelectSection: (id) => set(s => {
    const ids = s.selectedIds.includes(id) ? s.selectedIds.filter(i => i !== id) : [...s.selectedIds, id]
    return { selectedIds: ids, selectedId: null, fieldSelected: false }
  }),
  clearSelection: () => set({ selectedId: null, selectedIds: [], selectedRowIdx: null, selectedRowIdxs: [], rowSelectMode: false, blockRowMode: false }),
  selectField:   (v)     => set({ fieldSelected: v, selectedId: null, selectedIds: [], selectedRowIdx: null, selectedRowIdxs: [], rowSelectMode: false, blockRowMode: false }),
  setDrawingState: (ds)  => set({ drawingState: ds }),
  clearSections: ()      => set({ sections: [], selectedId: null, selectedIds: [], selectedRowIdx: null, selectedRowIdxs: [], rowSelectMode: false, blockRowMode: false, past: [], future: [] }),
  setSelectedRowIdx: (i) => set({ selectedRowIdx: i }),
  toggleSelectedRowIdx: (i) => set(s => {
    const has = s.selectedRowIdxs.includes(i)
    return { selectedRowIdxs: has ? s.selectedRowIdxs.filter(x => x !== i) : [...s.selectedRowIdxs, i], selectedRowIdx: i }
  }),
  setRowSelectMode: (v)  => set({ rowSelectMode: v, selectedRowIdx: null, selectedRowIdxs: [] }),
  setBlockRowMode:  (v)  => set({ blockRowMode: v }),

  // ── sections (all mutating ops push history first) ────────────────────────
  addRow: (row) => {
    get()._pushHistory()
    set((s) => ({
      sections: [...s.sections, { id: nanoid(), type: 'row', seats: 8, seatSpacing: 28, curve: 0, rotation: 0, label: `R${s.sections.filter(x => x.type === 'row').length + 1}`, color: '#60a5fa', categoryId: 'general', blockedSeats: [], ...row }],
    }))
  },

  addTable: (overrides) => {
    get()._pushHistory()
    set((s) => {
      const tableNum = s.sections.filter(x => x.type === 'table').length + 1
      return {
        sections: [...s.sections, {
          id: nanoid(), type: 'table',
          label: `T${tableNum}`,
          tableShape: 'round',
          chairs: 8, openSpaces: 0,
          tableW: 80, tableH: 60,
          autoRadius: true,
          rotation: 0,
          labelVisible: true,
          bookBySeat: false,
          color: '#7c3aed',
          categoryId: 'general',
          blockedSeats: [],
          ...overrides,
        }],
      }
    })
  },

  addSection: (section) => {
    get()._pushHistory()
    const defaultRowGroups = [{ rows: 5, seatsPerRow: Math.ceil((section.totalSeats || 50) / 5) }]
    set((s) => ({
      sections: [...s.sections, { id: nanoid(), rowGroups: defaultRowGroups, ...section }],
      drawingState: null,
    }))
  },

  updateSection: (id, patch) => {
    set((s) => ({
      sections: s.sections.map((sec) => sec.id === id ? { ...sec, ...patch } : sec),
    }))
  },

  // Call this once before a drag starts (not on every mousemove)
  commitUpdate: () => get()._pushHistory(),

  deleteSection: (id) => {
    get()._pushHistory()
    set((s) => ({
      sections: s.sections.filter((sec) => sec.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      selectedIds: s.selectedIds.filter(i => i !== id),
    }))
  },

  toggleLock: (id) => {
    set((s) => ({
      sections: s.sections.map(sec => sec.id === id ? { ...sec, locked: !sec.locked } : sec),
      selectedId: s.selectedId === id ? null : s.selectedId,
      selectedIds: s.selectedIds.filter(i => i !== id),
    }))
  },

  toggleBlockSeat: (secId, seatId) => {
    set(s => ({
      sections: s.sections.map(sec => {
        if (sec.id !== secId) return sec
        const blocked = sec.blockedSeats || []
        return { ...sec, blockedSeats: blocked.includes(seatId) ? blocked.filter(id => id !== seatId) : [...blocked, seatId] }
      })
    }))
  },

  toggleBlockRow: (secId, rowSeatIds) => {
    set(s => ({
      sections: s.sections.map(sec => {
        if (sec.id !== secId) return sec
        const blocked = sec.blockedSeats || []
        const allBlocked = rowSeatIds.every(id => blocked.includes(id))
        return {
          ...sec,
          blockedSeats: allBlocked
            ? blocked.filter(id => !rowSeatIds.includes(id))
            : [...new Set([...blocked, ...rowSeatIds])]
        }
      })
    }))
  },

  toggleRemoveSeat: (secId, seatId) => {
    set(s => ({
      sections: s.sections.map(sec => {
        if (sec.id !== secId) return sec
        const removed = sec.removedSeats || []
        return { ...sec, removedSeats: removed.includes(seatId) ? removed.filter(id => id !== seatId) : [...removed, seatId] }
      })
    }))
  },

  reorderSection: (id, dir) => {
    // dir: 1 = move up (higher z), -1 = move down
    get()._pushHistory()
    set((s) => {
      const arr = [...s.sections]
      const i = arr.findIndex(sec => sec.id === id)
      const j = i + dir
      if (j < 0 || j >= arr.length) return {}
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { sections: arr }
    })
  },

  duplicateSection: (id) => {
    get()._pushHistory()
    const sec = get().sections.find(s => s.id === id)
    if (!sec) return
    const clone = { ...snapshot(sec), id: nanoid() }
    // Offset clone slightly so it's visible
    if (clone.type === 'rect')  { clone.x += 20; clone.y += 20 }
    if (clone.type === 'arc')   { clone.startAngle += 10; clone.endAngle += 10 }
    if (clone.type === 'poly')  { clone.points = clone.points.map(p => ({ x: p.x + 20, y: p.y + 20 })) }
    set((s) => ({ sections: [...s.sections, clone], selectedId: clone.id }))
  },

  // ── undo / redo ───────────────────────────────────────────────────────────
  undo: () => {
    const { past, sections, future, selectedId } = get()
    if (!past.length) return
    const prev = past[past.length - 1]
    const stillExists = prev.some(s => s.id === selectedId)
    set({
      past: past.slice(0, -1),
      sections: prev,
      future: [snapshot(sections), ...future],
      selectedId: stillExists ? selectedId : null,
      selectedIds: [],
    })
  },

  redo: () => {
    const { past, sections, future, selectedId } = get()
    if (!future.length) return
    const next = future[0]
    const stillExists = next.some(s => s.id === selectedId)
    set({
      future: future.slice(1),
      sections: next,
      past: [...past, snapshot(sections)],
      selectedId: stillExists ? selectedId : null,
      selectedIds: [],
    })
  },

  // ── spacing ───────────────────────────────────────────────────────────────
  applySpacing: (ids, spacing, startIdx, endIdx) => {
    get()._pushHistory()
    set(s => {
      const secs = ids.map(id => s.sections.find(sec => sec.id === id)).filter(Boolean)
      if (secs.length < 2 || secs.some(sec => sec.type !== 'arc')) return {}
      
      const sorted = [...secs].sort((a, b) => a.startAngle - b.startAngle)
      const start = Math.max(0, startIdx)
      const end = Math.min(sorted.length - 1, endIdx)
      
      if (start >= end) return {}
      
      let currentAngle = sorted[start].startAngle
      const updates = {}
      
      for (let i = start; i <= end; i++) {
        const sec = sorted[i]
        const span = sec.endAngle - sec.startAngle
        updates[sec.id] = { startAngle: currentAngle, endAngle: currentAngle + span }
        currentAngle += span + (i < end ? spacing : 0)
      }
      
      return {
        sections: s.sections.map(sec => updates[sec.id] ? { ...sec, ...updates[sec.id] } : sec)
      }
    })
  },

  // ── export / import ───────────────────────────────────────────────────────
  exportJSON: () => {
    const { venueName, venueShape, fieldType, fieldX, fieldY, fieldScale, stageX, stageY, stageW, stageH, canvasSize, categories, sections } = get()
    const exportSections = sections.map(sec => ({
      ...sec,
      totalSeats: sec.rowGroups
        ? sec.rowGroups.reduce((s, g) => s + (g.rows || 1) * (g.seatsPerRow || 0), 0)
        : sec.totalSeats,
    }))
    return JSON.stringify({
      venue: { name: venueName, shape: venueShape, field: fieldType, fieldX, fieldY, fieldScale, stageX: stageX ?? fieldX, stageY: stageY ?? fieldY, stageW: stageW ?? 260, stageH: stageH ?? 120, canvasSize: canvasSize || 1000 },
      categories,
      sections: exportSections,
    }, null, 2)
  },

  importJSON: (jsonStr) => {
    const data = JSON.parse(jsonStr)
    if (!data.venue || !Array.isArray(data.sections)) throw new Error('Invalid layout file')
    const v = data.venue
    set({
      venueName: v.name || 'Imported Venue',
      venueShape: v.shape || 'circular',
      fieldType: v.field || 'none',
      fieldX: v.fieldX ?? 500,
      fieldY: v.fieldY ?? 500,
      fieldScale: v.fieldScale ?? 1,
      stageX: v.stageX ?? v.fieldX ?? 500,
      stageY: v.stageY ?? v.fieldY ?? 500,
      stageW: v.stageW ?? 260,
      stageH: v.stageH ?? 120,
      canvasSize: v.canvasSize || 1000,
      categories: data.categories || CATEGORIES,
      sections: data.sections,
      past: [], future: [], selectedId: null, drawingState: null,
    })
  },
}), {
  name: 'seatnova-store',
  version: 3,
  migrate: () => ({
    venueName: 'My Venue', venueShape: 'circular', fieldType: 'cricket',
    fieldX: 500, fieldY: 500, fieldScale: 1,
    stageX: 500, stageY: 500, stageW: 260, stageH: 120, stageLocked: false,
    canvasSize: 1000,
    sections: [], categories: CATEGORIES, theme: 'dark',
  }),
  partialize: (s) => ({
    venueName: s.venueName,
    venueShape: s.venueShape,
    fieldType: s.fieldType,
    fieldX: s.fieldX,
    fieldY: s.fieldY,
    fieldScale: s.fieldScale,
    stageX: s.stageX,
    stageY: s.stageY,
    stageW: s.stageW,
    stageH: s.stageH,
    stageLocked: s.stageLocked,
    canvasSize: s.canvasSize,
    floorPlanImage: s.floorPlanImage,
    floorPlanOpacity: s.floorPlanOpacity,
    floorPlanX: s.floorPlanX,
    floorPlanY: s.floorPlanY,
    floorPlanW: s.floorPlanW,
    floorPlanH: s.floorPlanH,
    floorPlanLocked: s.floorPlanLocked,
    sections: s.sections,
    categories: s.categories,
    theme: s.theme,
  }),
}))
