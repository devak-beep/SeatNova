import React from 'react'

export default function FieldShape({ type, x, y, scale = 1, stageW = 260, stageH = 120, selected, dragging, onPointerDown, onResizePointerDown }) {
  if (type === 'none') return null

  const content = (() => {
    if (type === 'cricket') return (
      <>
        <ellipse rx={180} ry={180} fill="#4ade80" opacity={0.9} />
        <ellipse rx={140} ry={140} fill="#22c55e" />
        <rect x={-12} y={-60} width={24} height={120} rx={4} fill="#d4a96a" />
        <line x1={-12} y1={-40} x2={12} y2={-40} stroke="#92400e" strokeWidth={1.5} />
        <line x1={-12} y1={40}  x2={12} y2={40}  stroke="#92400e" strokeWidth={1.5} />
      </>
    )
    if (type === 'football') return (
      <>
        <rect x={-180} y={-120} width={360} height={240} rx={6} fill="#4ade80" />
        <rect x={-180} y={-120} width={360} height={240} rx={6} fill="none" stroke="#fff" strokeWidth={2} />
        <circle r={50} fill="none" stroke="#fff" strokeWidth={2} />
        <line x1={0} y1={-120} x2={0} y2={120} stroke="#fff" strokeWidth={2} />
        <rect x={-180} y={-70} width={80} height={140} fill="none" stroke="#fff" strokeWidth={1.5} />
        <rect x={100}  y={-70} width={80} height={140} fill="none" stroke="#fff" strokeWidth={1.5} />
      </>
    )
    if (type === 'basketball') return (
      <>
        <rect x={-150} y={-100} width={300} height={200} rx={4} fill="#f97316" opacity={0.85} />
        <rect x={-150} y={-100} width={300} height={200} rx={4} fill="none" stroke="#fff" strokeWidth={2} />
        <circle r={40} fill="none" stroke="#fff" strokeWidth={2} />
        <line x1={0} y1={-100} x2={0} y2={100} stroke="#fff" strokeWidth={2} />
      </>
    )
    if (type === 'stage') {
      const hw = stageW / 2, hh = stageH / 2
      return (
        <>
          <rect x={-hw} y={-hh} width={stageW} height={stageH} rx={8} fill="#7c3aed" opacity={0.85} />
          <rect x={-hw} y={-hh} width={stageW} height={stageH} rx={8} fill="none" stroke="#a78bfa" strokeWidth={2} />
          <text textAnchor="middle" dominantBaseline="middle" fill="#e9d5ff" fontSize={18} fontWeight="bold">STAGE</text>
        </>
      )
    }
    return null
  })()

  const isStage = type === 'stage'
  const hw = isStage ? stageW / 2 : { cricket: 180, football: 180, basketball: 150 }[type] || 100
  const hh = isStage ? stageH / 2 : { cricket: 180, football: 120, basketball: 100 }[type] || 60
  const hs = 8 / scale  // handle half-size in local coords

  // 8 resize handles: corners + edge midpoints
  const handles = isStage && selected && onResizePointerDown ? [
    { id: 'nw', cx: -hw, cy: -hh, cursor: 'nw-resize' },
    { id: 'n',  cx:   0, cy: -hh, cursor: 'n-resize'  },
    { id: 'ne', cx:  hw, cy: -hh, cursor: 'ne-resize'  },
    { id: 'e',  cx:  hw, cy:   0, cursor: 'e-resize'   },
    { id: 'se', cx:  hw, cy:  hh, cursor: 'se-resize'  },
    { id: 's',  cx:   0, cy:  hh, cursor: 's-resize'   },
    { id: 'sw', cx: -hw, cy:  hh, cursor: 'sw-resize'  },
    { id: 'w',  cx: -hw, cy:   0, cursor: 'w-resize'   },
  ] : []

  return (
    <g
      transform={`translate(${x},${y}) scale(${scale})`}
      style={{ pointerEvents: isStage && onPointerDown ? 'all' : 'none', cursor: isStage && onPointerDown ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      onPointerDown={isStage ? onPointerDown : undefined}
    >
      {content}
      {selected && isStage && (
        <rect x={-hw} y={-hh} width={hw * 2} height={hh * 2}
          fill="none" stroke="#a78bfa" strokeWidth={1.5 / scale}
          strokeDasharray={`${6 / scale} ${3 / scale}`}
          style={{ pointerEvents: 'none' }} />
      )}
      {handles.map(h => (
        <rect key={h.id}
          x={h.cx - hs} y={h.cy - hs} width={hs * 2} height={hs * 2} rx={hs * 0.3}
          fill="#fff" stroke="#a78bfa" strokeWidth={1 / scale}
          style={{ cursor: h.cursor, pointerEvents: 'all' }}
          onPointerDown={e => { e.stopPropagation(); onResizePointerDown(e, h.id) }}
        />
      ))}
    </g>
  )
}
