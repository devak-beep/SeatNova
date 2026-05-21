import React, { useState, useContext } from 'react'
import { ThemeContext } from '../../EditorApp'
import { useStore } from '../../store/useStore'

const CATEGORIES = [
  { id: 'premium', label: 'Premium', color: '#f59e0b' },
  { id: 'gold', label: 'Gold', color: '#a78bfa' },
  { id: 'silver', label: 'Silver', color: '#60a5fa' },
  { id: 'general', label: 'General', color: '#94a3b8' },
]

export default function GridBlockEditor({ section, onUpdate }) {
  const { commitUpdate } = useStore()
  const t = useContext(ThemeContext)
  const enabled = section.gridDivisionEnabled ?? false

  const gridLayout = section.gridLayout || {
    totalRows: section.rowGroups?.reduce((sum, g) => sum + (g.rows || 1), 0) || 8,
    totalCols: section.colGroups?.[0]?.seats || section.rowGroups?.[0]?.seatsPerRow || 11,
    blocks: [],
  }

  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const [drawEnd, setDrawEnd] = useState(null)
  const [confirmOff, setConfirmOff] = useState(false)

  const blocks = gridLayout.blocks || []
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId)

  const handleToggle = () => {
    if (enabled && blocks.length > 0) {
      setConfirmOff(true)  // show warning before clearing
    } else {
      // When enabling: clear old blockedSeats (IDs won't match new gridLayout seat IDs)
      onUpdate({ gridDivisionEnabled: !enabled, ...(!enabled ? { showSeats: true, blockedSeats: [] } : {}) })
    }
  }

  const cellSize = 18

  const handleCellMouseDown = (row, col) => {
    setIsDrawing(true)
    setDrawStart({ row, col })
    setDrawEnd({ row, col })
  }

  const handleCellMouseEnter = (row, col) => {
    if (isDrawing && drawStart) {
      setDrawEnd({ row, col })
    }
  }

  const handleCellMouseUp = () => {
    if (isDrawing && drawStart && drawEnd) {
      const rowStart = Math.min(drawStart.row, drawEnd.row)
      const rowEnd = Math.max(drawStart.row, drawEnd.row)
      const colStart = Math.min(drawStart.col, drawEnd.col)
      const colEnd = Math.max(drawStart.col, drawEnd.col)

      // Check if any cell in the range is already occupied
      const hasConflict = blocks.some(b =>
        rowStart + 1 <= b.rowEnd && rowEnd + 1 >= b.rowStart &&
        colStart + 1 <= b.colEnd && colEnd + 1 >= b.colStart
      )

      if (!hasConflict) {
        const newBlock = {
          id: `block-${Date.now()}`,
          name: `Block ${blocks.length + 1}`,
          rowStart: rowStart + 1,
          rowEnd: rowEnd + 1,
          colStart: colStart + 1,
          colEnd: colEnd + 1,
          category: 'general',
          color: '#94a3b8',
          price: 500,
        }

        commitUpdate()
        const updatedBlocks = [...blocks, newBlock]
        onUpdate({ gridLayout: { ...gridLayout, blocks: updatedBlocks } })
        setSelectedBlockId(newBlock.id)
      }
    }
    setIsDrawing(false)
    setDrawStart(null)
    setDrawEnd(null)
  }

  const handleDeleteBlock = () => {
    commitUpdate()
    const updatedBlocks = blocks.filter((b) => b.id !== selectedBlockId)
    onUpdate({ gridLayout: { ...gridLayout, blocks: updatedBlocks } })
    setSelectedBlockId(null)
  }

  const handleUpdateBlock = (updates, pushHistory = false) => {
    if (pushHistory) commitUpdate()
    const updatedBlocks = blocks.map((b) =>
      b.id === selectedBlockId ? { ...b, ...updates } : b
    )
    onUpdate({ gridLayout: { ...gridLayout, blocks: updatedBlocks } })
  }

  const handleUpdateGridSize = (rows, cols) => {
    commitUpdate()
    const existingGroup = section.rowGroups?.[0] || {}
    onUpdate({
      gridLayout: { ...gridLayout, totalRows: rows, totalCols: cols },
      rowGroups: [{ ...existingGroup, rows, seatsPerRow: cols }],
    })
  }

  const isBlockInRange = (row, col) => {
    if (!isDrawing || !drawStart || !drawEnd) return false
    const minRow = Math.min(drawStart.row, drawEnd.row)
    const maxRow = Math.max(drawStart.row, drawEnd.row)
    const minCol = Math.min(drawStart.col, drawEnd.col)
    const maxCol = Math.max(drawStart.col, drawEnd.col)
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
  }

  const hasDrawConflict = () => {
    if (!isDrawing || !drawStart || !drawEnd) return false
    const rowStart = Math.min(drawStart.row, drawEnd.row)
    const rowEnd = Math.max(drawStart.row, drawEnd.row)
    const colStart = Math.min(drawStart.col, drawEnd.col)
    const colEnd = Math.max(drawStart.col, drawEnd.col)
    return blocks.some(b =>
      rowStart + 1 <= b.rowEnd && rowEnd + 1 >= b.rowStart &&
      colStart + 1 <= b.colEnd && colEnd + 1 >= b.colStart
    )
  }

  const getBlockForCell = (row, col) => {
    return blocks.find(
      (b) =>
        row + 1 >= b.rowStart &&
        row + 1 <= b.rowEnd &&
        col + 1 >= b.colStart &&
        col + 1 <= b.colEnd
    )
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? 12 : 0, paddingBottom: 8, borderBottom: `1px solid ${t.panelBorder}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Seat Division (Visual Editor)
        </span>
        <button onClick={handleToggle}
          style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative', background: enabled ? t.accent : t.inputBorder, transition: 'background 0.2s', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 2, left: enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>

      {enabled && <><div
        style={{
          fontSize: 9,
          color: t.labelColor,
          background: t.cardBg,
          padding: '8px 10px',
          borderRadius: 4,
          marginBottom: 12,
          border: `1px solid ${t.panelBorder}`,
          lineHeight: '1.4',
        }}
      >
        <strong>How to:</strong> Click and drag on grid to create a block. Click a block to edit it.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 10, color: t.labelColor, display: 'block', marginBottom: 4, fontWeight: 600 }}>Block Row Gap (px)</label>
          <input type="number" step="1" min="0" max="500" value={section.blockRowGap ?? 0}
            onChange={(e) => onUpdate({ blockRowGap: Math.max(0, Number(e.target.value) || 0) })}
            style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.inputColor, padding: '5px 8px', fontSize: 12 }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: t.labelColor, display: 'block', marginBottom: 4, fontWeight: 600 }}>Block Col Gap (px)</label>
          <input type="number" step="1" min="0" max="500" value={section.blockColGap ?? 0}
            onChange={(e) => onUpdate({ blockColGap: Math.max(0, Number(e.target.value) || 0) })}
            style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.inputColor, padding: '5px 8px', fontSize: 12 }} />
        </div>
      </div>



      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div>
          <label
            style={{
              fontSize: 10,
              color: t.labelColor,
              display: 'block',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            Total Rows
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={gridLayout.totalRows}
            onChange={(e) =>
              handleUpdateGridSize(Number(e.target.value), gridLayout.totalCols)
            }
            style={{
              width: '100%',
              background: t.inputBg,
              border: `1px solid ${t.inputBorder}`,
              borderRadius: 4,
              color: t.inputColor,
              padding: '5px 8px',
              fontSize: 12,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 10,
              color: t.labelColor,
              display: 'block',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            Total Columns
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={gridLayout.totalCols}
            onChange={(e) =>
              handleUpdateGridSize(gridLayout.totalRows, Number(e.target.value))
            }
            style={{
              width: '100%',
              background: t.inputBg,
              border: `1px solid ${t.inputBorder}`,
              borderRadius: 4,
              color: t.inputColor,
              padding: '5px 8px',
              fontSize: 12,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginBottom: 12,
          padding: 8,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 6,
          overflowX: 'auto',
          maxHeight: 300,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            userSelect: 'none',
          }}
          onMouseLeave={() => setIsDrawing(false)}
          onMouseUp={handleCellMouseUp}
        >
          {Array.from({ length: gridLayout.totalRows }).map((_, row) => (
            <div key={row} style={{ display: 'flex' }}>
              {Array.from({ length: gridLayout.totalCols }).map((_, col) => {
                const block = getBlockForCell(row, col)
                const isInDrawRange = isBlockInRange(row, col)

                return (
                  <div
                    key={`${row}-${col}`}
                    onMouseDown={() => handleCellMouseDown(row, col)}
                    onMouseEnter={() => handleCellMouseEnter(row, col)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      border: `1px solid ${t.panelBorder}`,
                      background: isInDrawRange
                        ? (hasDrawConflict() ? '#ef4444' : '#4f46e5')
                        : block
                        ? block.color
                        : t.inputBg,
                      cursor: block ? 'not-allowed' : 'crosshair',
                      opacity: block ? 0.8 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 6,
                      color: '#fff',
                      fontWeight: 600,
                      transition: isInDrawRange ? 'background 0.05s' : 'none',
                    }}
                    title={block ? `${block.name} (occupied)` : `R${row + 1}C${col + 1}`}
                  >
                    {block &&
                    row === block.rowStart - 1 &&
                    col === block.colStart - 1
                      ? block.name.split(' ')[1]
                      : ''}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: t.labelColor,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 8,
          }}
        >
          Blocks ({blocks.length})
        </div>

        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
          {blocks.length === 0 ? (
            <div
              style={{
                fontSize: 10,
                color: t.labelColor,
                textAlign: 'center',
                padding: '12px 8px',
                background: t.cardBg,
                borderRadius: 4,
                border: `1px solid ${t.panelBorder}`,
              }}
            >
              No blocks yet. Draw on the grid above.
            </div>
          ) : (
            blocks.map((block) => (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                style={{
                  padding: '6px 8px',
                  marginBottom: 4,
                  background:
                    selectedBlockId === block.id ? t.accent : t.cardBg,
                  border: `1px solid ${
                    selectedBlockId === block.id ? t.accent : t.panelBorder
                  }`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      background: block.color,
                      borderRadius: 2,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: t.inputColor,
                    }}
                  >
                    {block.name}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: t.labelColor,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 2,
                  }}
                >
                  <div>
                    R{block.rowStart}-{block.rowEnd} / C{block.colStart}-
                    {block.colEnd}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {(block.rowEnd - block.rowStart + 1) *
                      (block.colEnd - block.colStart + 1)}{' '}
                    seats
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedBlock && (
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 6,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: t.inputColor,
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: `1px solid ${t.panelBorder}`,
            }}
          >
            Edit: {selectedBlock.name}
          </div>

          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                fontSize: 9,
                color: t.labelColor,
                display: 'block',
                marginBottom: 3,
                fontWeight: 600,
              }}
            >
              Name
            </label>
            <input
              type="text"
              value={selectedBlock.name}
              onChange={(e) => handleUpdateBlock({ name: e.target.value })}
              onBlur={() => commitUpdate()}
              style={{
                width: '100%',
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                borderRadius: 4,
                color: t.inputColor,
                padding: '4px 6px',
                fontSize: 10,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                fontSize: 9,
                color: t.labelColor,
                display: 'block',
                marginBottom: 3,
                fontWeight: 600,
              }}
            >
              Category
            </label>
            <select
              value={selectedBlock.category}
              onChange={(e) => {
                const cat = CATEGORIES.find((c) => c.id === e.target.value)
                handleUpdateBlock({ category: cat.id, color: cat.color }, true)
              }}
              style={{
                width: '100%',
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                borderRadius: 4,
                color: t.inputColor,
                padding: '4px 6px',
                fontSize: 10,
                boxSizing: 'border-box',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                fontSize: 9,
                color: t.labelColor,
                display: 'block',
                marginBottom: 3,
                fontWeight: 600,
              }}
            >
              Price (₹)
            </label>
            <input
              type="number"
              value={selectedBlock.price}
              onChange={(e) => handleUpdateBlock({ price: Number(e.target.value) })}
              onBlur={() => commitUpdate()}
              style={{
                width: '100%',
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                borderRadius: 4,
                color: t.inputColor,
                padding: '4px 6px',
                fontSize: 10,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 9, color: t.labelColor, display: 'block', marginBottom: 3, fontWeight: 600 }}>Position</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
              {[
                { key: 'rowStart', label: 'R start', min: 1, max: selectedBlock.rowEnd },
                { key: 'rowEnd',   label: 'R end',   min: selectedBlock.rowStart, max: gridLayout.totalRows },
                { key: 'colStart', label: 'C start', min: 1, max: selectedBlock.colEnd },
                { key: 'colEnd',   label: 'C end',   min: selectedBlock.colStart, max: gridLayout.totalCols },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <div style={{ fontSize: 8, color: t.labelColor, marginBottom: 2 }}>{label}</div>
                  <input type="number" min={min} max={max}
                    value={selectedBlock[key]}
                    onChange={(e) => {
                      const v = Math.max(min, Math.min(max, Number(e.target.value) || min))
                      const updated = { ...selectedBlock, [key]: v }
                      // conflict check against other blocks
                      const conflict = blocks.some(b => b.id !== selectedBlock.id &&
                        updated.rowStart <= b.rowEnd && updated.rowEnd >= b.rowStart &&
                        updated.colStart <= b.colEnd && updated.colEnd >= b.colStart
                      )
                      if (!conflict) handleUpdateBlock({ [key]: v }, true)
                    }}
                    style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.inputColor, padding: '3px 4px', fontSize: 10, boxSizing: 'border-box', outline: 'none' }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8, color: t.labelColor, marginTop: 4 }}>
              {(selectedBlock.rowEnd - selectedBlock.rowStart + 1) * (selectedBlock.colEnd - selectedBlock.colStart + 1)} seats
            </div>
          </div>

          <button
            onClick={handleDeleteBlock}
            style={{
              width: '100%',
              background: '#ef4444',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              padding: '6px 8px',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.target.style.background = '#dc2626')}
            onMouseOut={(e) => (e.target.style.background = '#ef4444')}
          >
            Delete Block
          </button>
        </div>
      )}
    </>}

    {confirmOff && (
      <>
        <div onClick={() => setConfirmOff(false)} style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.55)' }} />
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 200, background: t.panelBg, border: `1px solid ${t.panelBorder}`, borderRadius: 12, padding: 24, width: 300, boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.inputColor, marginBottom: 10 }}>⚠️ Disable Seat Division?</div>
          <div style={{ fontSize: 13, color: t.labelColor, lineHeight: 1.6, marginBottom: 20 }}>
            This will <b style={{ color: '#f87171' }}>permanently delete all seat blocks</b> you have drawn. This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmOff(false)} style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${t.inputBorder}`, background: 'none', color: t.inputColor, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={() => {
              onUpdate({ gridDivisionEnabled: false, gridLayout: { ...gridLayout, blocks: [] }, blockedSeats: [] })
              setConfirmOff(false)
            }} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Delete & Disable
            </button>
          </div>
        </div>
      </>
    )}
    </div>
  )
}
