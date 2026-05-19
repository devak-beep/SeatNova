import React, { useMemo } from 'react'

// curve=0 → straight, curve>0 → arc upward, curve<0 → downward (parabolic)
function generateRowSeats(seats, seatSpacing, curve) {
  const totalW = (seats - 1) * seatSpacing
  const positions = []
  for (let i = 0; i < seats; i++) {
    const t = seats === 1 ? 0 : i / (seats - 1)
    const lx = -totalW / 2 + i * seatSpacing
    const ly = curve * 4 * t * (t - 1)
    positions.push({ x: lx, y: ly, id: i })
  }
  return positions
}

export default function RowSection({ section, selected, onPointerDown, onContextMenu, onToggleBlockSeat }) {
  const {
    x = 500, y = 500,
    seats = 8,
    seatSpacing = 28,
    seatSize = null,
    curve = 0,
    rotation = 0,
    color = '#60a5fa',
    label = 'R',
    blockedSeats = [],
  } = section

  const seatR = seatSize != null ? seatSize : seatSpacing * 0.35
  const positions = useMemo(
    () => generateRowSeats(seats, seatSpacing, curve),
    [seats, seatSpacing, curve]
  )

  const totalW = (seats - 1) * seatSpacing + seatR * 2
  const totalH = seatR * 2 + Math.abs(curve) + 16

  // Curve handle: sits above the midpoint of the row
  const curveHandleY = y - totalH / 2 - 20 - curve * 0.5

  return (
    <g transform={`rotate(${rotation}, ${x}, ${y})`}>
      {/* Invisible hit area */}
      <rect
        x={x - totalW / 2 - 8} y={y - totalH / 2 - 8}
        width={totalW + 16} height={totalH + 16}
        fill="transparent"
        stroke={selected ? '#3b82f6' : 'transparent'}
        strokeWidth={selected ? 1.5 : 0}
        strokeDasharray="4 3"
        rx={6}
        style={{ cursor: 'move' }}
        onPointerDown={e => { e.stopPropagation(); onPointerDown(e, 'move', null) }}
        onContextMenu={onContextMenu}
      />

      {/* Seats */}
      {positions.map(p => {
        const blocked = blockedSeats.includes(p.id)
        return (
          <circle
            key={p.id}
            cx={x + p.x} cy={y + p.y}
            r={seatR}
            fill={blocked ? '#ef4444' : color}
            fillOpacity={selected ? 0.95 : 0.8}
            stroke={selected ? '#fff' : 'rgba(0,0,0,0.25)'}
            strokeWidth={selected ? 1.5 : 1}
            style={{ cursor: selected ? 'pointer' : 'move' }}
            onPointerDown={e => {
              e.stopPropagation()
              if (selected) onToggleBlockSeat?.(p.id)
              else onPointerDown(e, 'move', null)
            }}
            onContextMenu={onContextMenu}
          />
        )
      })}

      {/* Label */}
      <text
        x={x} y={y + totalH / 2 + 10}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={Math.max(8, seatSpacing * 0.45)} fill={color} fontWeight="700"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >{label}</text>

      {selected && <>
        {/* Rotation handle */}
        <line
          x1={x} y1={y - totalH / 2 - 8}
          x2={x} y2={y - totalH / 2 - 24}
          stroke="#fff" strokeWidth={1.5} strokeDasharray="3 2"
          style={{ pointerEvents: 'none' }}
        />
        <circle
          cx={x} cy={y - totalH / 2 - 24} r={7}
          fill="#7c3aed" stroke="#fff" strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onPointerDown={e => { e.stopPropagation(); onPointerDown(e, 'rotate', null) }}
        />

        {/* Left spacing handle */}
        <circle
          cx={x - totalW / 2 - 14} cy={y} r={6}
          fill="#f59e0b" stroke="#fff" strokeWidth={1.5}
          style={{ cursor: 'ew-resize' }}
          onPointerDown={e => { e.stopPropagation(); onPointerDown(e, 'row-spacing', 'left') }}
        />
        {/* Right spacing handle */}
        <circle
          cx={x + totalW / 2 + 14} cy={y} r={6}
          fill="#f59e0b" stroke="#fff" strokeWidth={1.5}
          style={{ cursor: 'ew-resize' }}
          onPointerDown={e => { e.stopPropagation(); onPointerDown(e, 'row-spacing', 'right') }}
        />

        {/* Curve handle */}
        <line
          x1={x} y1={y - totalH / 2 - 8}
          x2={x} y2={curveHandleY + 8}
          stroke="#22d3ee" strokeWidth={1} strokeDasharray="3 2"
          style={{ pointerEvents: 'none' }}
        />
        <rect
          x={x - 6} y={curveHandleY - 6}
          width={12} height={12}
          fill="#22d3ee" stroke="#fff" strokeWidth={1.5}
          transform={`rotate(45, ${x}, ${curveHandleY})`}
          style={{ cursor: 'ns-resize' }}
          onPointerDown={e => { e.stopPropagation(); onPointerDown(e, 'row-curve', null) }}
        />
      </>}
    </g>
  )
}
