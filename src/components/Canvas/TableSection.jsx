import React, { useMemo } from 'react'

function generateChairs(sec) {
  const { tableShape = 'round', chairs = 8, openSpaces = 0, x, y, tableW = 100, tableH = 60, autoRadius = true } = sec
  const chairR = Math.max(6, Math.min(tableW, tableH) * 0.12)
  const gap = chairR * 0.6
  const positions = []

  if (tableShape === 'round') {
    const total = chairs + openSpaces
    if (total === 0) return []
    const tableRadius = autoRadius
      ? Math.max(tableW / 2, (total * (chairR * 2 + gap)) / (2 * Math.PI))
      : tableW / 2
    const orbitR = tableRadius + chairR + gap
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * 2 * Math.PI - Math.PI / 2
      positions.push({
        cx: x + Math.cos(angle) * orbitR,
        cy: y + Math.sin(angle) * orbitR,
        isOpen: i >= chairs,
        id: i < chairs ? `${sec.label}-Chair${i + 1}` : null,
      })
    }
  } else {
    // Per-side counts (user-controlled)
    const top    = sec.seatsTop    ?? 2
    const bottom = sec.seatsBottom ?? 2
    const left   = sec.seatsLeft   ?? 1
    const right  = sec.seatsRight  ?? 1
    const hw = tableW / 2, hh = tableH / 2
    const orbitX = hw + chairR + gap
    const orbitY = hh + chairR + gap

    const addSide = (count, getPos) => {
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? (i + 0.5) / count : 0.5
        positions.push({ ...getPos(t), isOpen: false, id: null })
      }
    }

    addSide(top,    t => ({ cx: x - hw + t * tableW, cy: y - orbitY }))
    addSide(right,  t => ({ cx: x + orbitX,          cy: y - hh + t * tableH }))
    addSide(bottom, t => ({ cx: x - hw + t * tableW, cy: y + orbitY }))
    addSide(left,   t => ({ cx: x - orbitX,          cy: y - hh + t * tableH }))

    let seatNum = 1
    positions.forEach((p, i) => {
      p.id = `${sec.label}-Chair${seatNum++}`
    })
  }

  return positions
}

export default function TableSection({ section, selected, onPointerDown, onContextMenu, onToggleBlockSeat }) {
  const {
    x, y, tableW = 100, tableH = 60, tableShape = 'round',
    chairs = 8, openSpaces = 0, autoRadius = true,
    rotation = 0, label = '', labelVisible = true,
    color = '#7c3aed', blockedSeats = [], bookBySeat = false,
  } = section

  const chairPositions = useMemo(
    () => generateChairs(section),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [x, y, tableW, tableH, tableShape, chairs, openSpaces, autoRadius, section.label,
     section.seatsTop, section.seatsBottom, section.seatsLeft, section.seatsRight]
  )

  const chairR = Math.max(6, Math.min(tableW, tableH) * 0.12)

  const allX = chairPositions.map(p => p.cx)
  const allY = chairPositions.map(p => p.cy)
  const pad = chairR * 1.5
  const bx = (allX.length ? Math.min(...allX) : x - tableW / 2) - pad
  const by = (allY.length ? Math.min(...allY) : y - tableH / 2) - pad
  const bw = (allX.length ? Math.max(...allX) - Math.min(...allX) : tableW) + pad * 2
  const bh = (allY.length ? Math.max(...allY) - Math.min(...allY) : tableH) + pad * 2

  const tableRadius = autoRadius && tableShape === 'round'
    ? Math.max(tableW / 2, ((chairs + openSpaces) * (chairR * 2 + chairR * 0.6)) / (2 * Math.PI))
    : tableW / 2

  return (
    <g
      transform={`rotate(${rotation}, ${x}, ${y})`}
      style={{ cursor: 'move' }}
      onPointerDown={e => { e.stopPropagation(); onPointerDown(e, 'move', null) }}
      onContextMenu={onContextMenu}
    >
      {selected && (
        <rect x={bx} y={by} width={bw} height={bh}
          fill="none" stroke="#7c3aed" strokeWidth={1.5}
          strokeDasharray="6 3" rx={6}
          style={{ pointerEvents: 'none' }} />
      )}

      {tableShape === 'round' ? (
        <circle cx={x} cy={y} r={tableRadius}
          fill={color} fillOpacity={selected ? 0.85 : 0.65}
          stroke={selected ? '#fff' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2 : 1} />
      ) : (
        <rect x={x - tableW / 2} y={y - tableH / 2} width={tableW} height={tableH}
          fill={color} fillOpacity={selected ? 0.85 : 0.65}
          stroke={selected ? '#fff' : 'rgba(0,0,0,0.25)'} strokeWidth={selected ? 2 : 1} rx={8} />
      )}

      {labelVisible && (
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
          fontSize={Math.max(8, Math.min(tableW, tableH) * 0.22)}
          fill="#fff" fontWeight="700"
          style={{ pointerEvents: 'none', userSelect: 'none' }}>{label}</text>
      )}

      {chairPositions.map((p, i) => {
        const blocked = blockedSeats.includes(p.id)
        const isOpen = p.isOpen
        const isClickable = bookBySeat && !isOpen && p.id
        return (
          <circle key={i} cx={p.cx} cy={p.cy} r={chairR}
            fill={isOpen ? 'transparent' : blocked ? '#ef4444' : '#f8fafc'}
            fillOpacity={isOpen ? 0 : 0.9}
            stroke={isOpen ? 'rgba(255,255,255,0.2)' : blocked ? '#b91c1c' : color}
            strokeWidth={isOpen ? 1 : 1.5}
            strokeDasharray={isOpen ? '3 2' : undefined}
            style={{ cursor: isClickable ? 'pointer' : 'move' }}
            onPointerDown={isClickable ? e => { e.stopPropagation(); onToggleBlockSeat?.(p.id) } : undefined}
          />
        )
      })}

      {selected && bookBySeat && chairPositions.map((p, i) => {
        if (p.isOpen) return null
        return (
          <text key={`n${i}`} x={p.cx} y={p.cy}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={chairR * 0.85} fill={color} fontWeight="700"
            style={{ pointerEvents: 'none', userSelect: 'none' }}>{i + 1}</text>
        )
      })}
    </g>
  )
}
