import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function SeatView3D({ section, fieldType, onClose, preview, stageX, stageY, stageW, stageH, venueShape }) {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!section || !mountRef.current) return
    const el = mountRef.current
    let renderer = null

    const w = el.clientWidth, h = el.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87CEEB)
    scene.fog = new THREE.Fog(0x87CEEB, 180, 400)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    // Calculate camera position based on section
    let camX = 0, camY = 10, camZ = 60
    let lookX = 0, lookY = 2, lookZ = 0
    
    // For stage, look at the stage position
    if (fieldType === 'stage' && stageX && stageY) {
      lookX = (stageX - 500) * 0.1
      lookZ = -(stageY - 500) * 0.1
      lookY = 1.5  // Stage height
    }
    
    if (section.type === 'arc') {
      const midAngle = ((section.startAngle + section.endAngle) / 2) + 90
      const angleRad = midAngle * Math.PI / 180
      const avgR = (section.innerR + section.outerR) / 2
      const worldR = avgR * 0.1
      // Push camera a bit beyond the section so it's seated in the stand looking inward
      const camR = worldR + 4
      camX = Math.cos(angleRad) * camR
      camZ = -Math.sin(angleRad) * camR
      // Height scales with distance: near rows sit low, far rows sit high
      camY = 3 + worldR * 0.35
    } else if (section.type === 'rect') {
      const cx = section.x + section.w / 2
      const cy = section.y + section.h / 2
      camX = (cx - 500) * 0.1
      camZ = -(cy - 500) * 0.1
      const distFromCenter = Math.sqrt(camX * camX + camZ * camZ)
      // Push slightly outward so camera is behind the stand face
      const pushFactor = distFromCenter > 0 ? (distFromCenter + 4) / distFromCenter : 1
      camX *= pushFactor
      camZ *= pushFactor
      camY = 3 + distFromCenter * 0.35
    } else if (section.type === 'poly' && section.points?.length) {
      const cx = section.points.reduce((s, p) => s + p.x, 0) / section.points.length
      const cy = section.points.reduce((s, p) => s + p.y, 0) / section.points.length
      camX = (cx - 500) * 0.1
      camZ = -(cy - 500) * 0.1
      const distFromCenter = Math.sqrt(camX * camX + camZ * camZ)
      const pushFactor = distFromCenter > 0 ? (distFromCenter + 4) / distFromCenter : 1
      camX *= pushFactor
      camZ *= pushFactor
      camY = 3 + distFromCenter * 0.35
    }

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.3, 400)
    camera.position.set(camX, camY, camZ)
    camera.lookAt(lookX, lookY, lookZ)

    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const sun = new THREE.DirectionalLight(0xfffbe0, 1.0)
    sun.position.set(40, 100, 40)
    scene.add(sun)

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshLambertMaterial({ color: fieldType === 'cricket' ? 0x3a7d44 : fieldType === 'basketball' ? 0xc2956e : 0x2e6b38 })
    )
    ground.rotation.x = -Math.PI / 2
    scene.add(ground)

    if (fieldType === 'cricket') {
      // Stripes
      for (let i = -6; i <= 6; i++) {
        const s = new THREE.Mesh(
          new THREE.PlaneGeometry(8, 120),
          new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0x3a7d44 : 0x2e6b38 })
        )
        s.rotation.x = -Math.PI / 2
        s.position.set(i * 8, 0.01, 0)
        scene.add(s)
      }
      // Pitch
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(3.05, 20.12),
        new THREE.MeshLambertMaterial({ color: 0xc8a96e })
      )
      strip.rotation.x = -Math.PI / 2
      strip.position.y = 0.02
      scene.add(strip)
      // Boundary
      const ropePoints = Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2
        return new THREE.Vector3(Math.cos(a) * 44, 0.1, Math.sin(a) * 44)
      })
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ropePoints),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
      ))
    } else if (fieldType === 'football' || fieldType === 'soccer') {
      // Football field
      const field = new THREE.Mesh(
        new THREE.PlaneGeometry(105, 68),
        new THREE.MeshLambertMaterial({ color: 0x2e6b38 })
      )
      field.rotation.x = -Math.PI / 2
      field.position.y = 0.01
      scene.add(field)
      
      // Field lines
      const lines = [
        // Outer boundary
        [[-52.5, 0.02, -34], [52.5, 0.02, -34]],
        [[-52.5, 0.02, 34], [52.5, 0.02, 34]],
        [[-52.5, 0.02, -34], [-52.5, 0.02, 34]],
        [[52.5, 0.02, -34], [52.5, 0.02, 34]],
        // Center line
        [[0, 0.02, -34], [0, 0.02, 34]],
        // Penalty areas
        [[-52.5, 0.02, -20], [-36, 0.02, -20]],
        [[-52.5, 0.02, 20], [-36, 0.02, 20]],
        [[-36, 0.02, -20], [-36, 0.02, 20]],
        [[52.5, 0.02, -20], [36, 0.02, -20]],
        [[52.5, 0.02, 20], [36, 0.02, 20]],
        [[36, 0.02, -20], [36, 0.02, 20]],
      ]
      lines.forEach(([p1, p2]) => {
        scene.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p1), new THREE.Vector3(...p2)]),
          new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
        ))
      })
      // Center circle
      const centerCircle = []
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2
        centerCircle.push(new THREE.Vector3(Math.cos(a) * 9.15, 0.02, Math.sin(a) * 9.15))
      }
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(centerCircle),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
      ))
    } else if (fieldType === 'basketball') {
      // Basketball court
      const court = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 15),
        new THREE.MeshLambertMaterial({ color: 0xc2956e })
      )
      court.rotation.x = -Math.PI / 2
      court.position.y = 0.01
      scene.add(court)
      
      // Court lines
      const lines = [
        // Outer boundary
        [[-14, 0.02, -7.5], [14, 0.02, -7.5]],
        [[-14, 0.02, 7.5], [14, 0.02, 7.5]],
        [[-14, 0.02, -7.5], [-14, 0.02, 7.5]],
        [[14, 0.02, -7.5], [14, 0.02, 7.5]],
        // Center line
        [[0, 0.02, -7.5], [0, 0.02, 7.5]],
        // Three-point lines (simplified)
        [[-14, 0.02, -3], [-8, 0.02, -3]],
        [[-14, 0.02, 3], [-8, 0.02, 3]],
        [[14, 0.02, -3], [8, 0.02, -3]],
        [[14, 0.02, 3], [8, 0.02, 3]],
      ]
      lines.forEach(([p1, p2]) => {
        scene.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p1), new THREE.Vector3(...p2)]),
          new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
        ))
      })
      // Center circle
      const centerCircle = []
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2
        centerCircle.push(new THREE.Vector3(Math.cos(a) * 1.8, 0.02, Math.sin(a) * 1.8))
      }
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(centerCircle),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
      ))
    } else if (fieldType === 'stage') {
      // Stage platform - use actual stage position and size
      const stagePosX = stageX ? (stageX - 500) * 0.1 : 0
      const stagePosZ = stageY ? -(stageY - 500) * 0.1 : 0
      const stageWidth = (stageW || 260) * 0.1
      const stageDepth = (stageH || 120) * 0.1
      
      const stage = new THREE.Mesh(
        new THREE.BoxGeometry(stageWidth, 1.5, stageDepth),
        new THREE.MeshLambertMaterial({ color: 0x2c2c2c })
      )
      stage.position.set(stagePosX, 0.75, stagePosZ)
      scene.add(stage)
    }

    // Stands - show around the field, not just opposite to camera
    if (fieldType !== 'stage') {
      // Different colors based on field type
      let standColors
      if (fieldType === 'cricket') {
        standColors = [
          { iR: 47, oR: 66, yB: 0, yT: 10, color: 0xc0392b },
          { iR: 66, oR: 88, yB: 10, yT: 24, color: 0x2980b9 },
        ]
      } else if (fieldType === 'football' || fieldType === 'soccer') {
        standColors = [
          { iR: 47, oR: 66, yB: 0, yT: 10, color: 0x16a34a },
          { iR: 66, oR: 88, yB: 10, yT: 24, color: 0x0891b2 },
        ]
      } else if (fieldType === 'basketball') {
        standColors = [
          { iR: 47, oR: 66, yB: 0, yT: 10, color: 0xf97316 },
          { iR: 66, oR: 88, yB: 10, yT: 24, color: 0x7c3aed },
        ]
      } else {
        standColors = [
          { iR: 47, oR: 66, yB: 0, yT: 10, color: 0x6b7280 },
          { iR: 66, oR: 88, yB: 10, yT: 24, color: 0x475569 },
        ]
      }
      
      if (venueShape === 'rectangular') {
        // Field half-dimensions + gap before stands start
        const isFootball = fieldType === 'football' || fieldType === 'soccer'
        const isBasketball = fieldType === 'basketball'
        const fHalfX = isFootball ? 52.5 : isBasketball ? 14 : 44
        const fHalfZ = isFootball ? 34 : isBasketball ? 7.5 : 44
        // tiers: offset from field edge
        const tiers = standColors.map(({ yB, yT, color }, i) => ({
          gap: 4 + i * 10, depth: 10, yB, yT, color
        }))
        // 4 sides: +X, -X, +Z, -Z
        const sides = [
          { axis: 'x', sign: 1,  halfX: fHalfX, halfZ: fHalfZ },
          { axis: 'x', sign: -1, halfX: fHalfX, halfZ: fHalfZ },
          { axis: 'z', sign: 1,  halfX: fHalfX, halfZ: fHalfZ },
          { axis: 'z', sign: -1, halfX: fHalfX, halfZ: fHalfZ },
        ]
        sides.forEach(({ axis, sign, halfX, halfZ }) => {
          tiers.forEach(({ gap, depth, yB, yT, color }) => {
            const height = yT - yB
            const offset = (axis === 'x' ? halfX : halfZ) + gap + depth / 2
            const longSide = (axis === 'x' ? halfZ : halfX) * 2 + gap * 2 + depth * 2
            const w = axis === 'x' ? depth : longSide
            const d = axis === 'x' ? longSide : depth
            const stand = new THREE.Mesh(
              new THREE.BoxGeometry(w, height, d),
              new THREE.MeshLambertMaterial({ color })
            )
            stand.position.set(
              axis === 'x' ? sign * offset : 0,
              yB + height / 2,
              axis === 'z' ? sign * offset : 0
            )
            scene.add(stand)
          })
        })
        // Rectangular roof on all 4 sides
        tiers.slice(-1).forEach(({ gap, depth, yT }) => {
          const roofY = yT + 2
          const roofThick = 0.5
          const sides2 = [
            { axis: 'x', sign: 1 }, { axis: 'x', sign: -1 },
            { axis: 'z', sign: 1 }, { axis: 'z', sign: -1 },
          ]
          sides2.forEach(({ axis, sign }) => {
            const offset = (axis === 'x' ? fHalfX : fHalfZ) + gap + depth / 2
            const longSide = (axis === 'x' ? fHalfZ : fHalfX) * 2 + gap * 2 + depth * 2
            const w = axis === 'x' ? depth + 2 : longSide
            const d = axis === 'x' ? longSide : depth + 2
            const roof = new THREE.Mesh(
              new THREE.BoxGeometry(w, roofThick, d),
              new THREE.MeshLambertMaterial({ color: 0xb0bec5 })
            )
            roof.position.set(
              axis === 'x' ? sign * offset : 0,
              roofY,
              axis === 'z' ? sign * offset : 0
            )
            scene.add(roof)
          })
        })
      } else {
        // Circular stands - full 360 degrees
        const standSegs = 64
        standColors.forEach(({ iR, oR, yB, yT, color }) => {
          const pos = [], idx = []
          for (let i = 0; i <= standSegs; i++) {
            const a = (i / standSegs) * Math.PI * 2
            const c = Math.cos(a), s = Math.sin(a)
            pos.push(c * iR, yB, s * iR, c * iR, yT, s * iR, c * oR, yB, s * oR, c * oR, yT, s * oR)
          }
          for (let i = 0; i < standSegs; i++) {
            const b = i * 4, n = (i + 1) * 4
            idx.push(b + 1, b + 3, n + 1, n + 1, b + 3, n + 3, b, n, b + 1, n, n + 1, b + 1, b + 2, b + 3, n + 2, n + 2, b + 3, n + 3)
          }
          const geo = new THREE.BufferGeometry()
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
          geo.setIndex(idx)
          geo.computeVertexNormals()
          scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })))
        })
      }

      // Roof (circular only for non-rectangular)
      if (venueShape !== 'rectangular') {
        const farAngle = Math.atan2(camZ, camX) + Math.PI
        const roofPos = [], roofIdx = [], roofSpan = Math.PI * 1.5, roofSegs = 48
        for (let i = 0; i <= roofSegs; i++) {
          const a = farAngle - roofSpan / 2 + (i / roofSegs) * roofSpan
          roofPos.push(Math.cos(a) * 82, 30, Math.sin(a) * 82, Math.cos(a) * 96, 30, Math.sin(a) * 96)
        }
        for (let i = 0; i < roofSegs; i++) {
          const b = i * 2, n = (i + 1) * 2
          roofIdx.push(b, b + 1, n, n, b + 1, n + 1)
        }
        const roofGeo = new THREE.BufferGeometry()
        roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3))
        roofGeo.setIndex(roofIdx)
        roofGeo.computeVertexNormals()
        scene.add(new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0xb0bec5, side: THREE.DoubleSide })))
      }
    }

    renderer.render(scene, camera)

    return () => {
      renderer.dispose()
      while (el.firstChild) el.removeChild(el.firstChild)
    }
  }, [section, fieldType])

  if (!section) return null

  if (preview) {
    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '90vw', maxWidth: 900, height: '60vh', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', top: 12, left: 16, color: '#fff', fontSize: 13, opacity: 0.7, pointerEvents: 'none' }}>
          View from {section.label}
        </div>
      </div>
      <button onClick={onClose} style={{ marginTop: 16, padding: '10px 28px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
        Close View
      </button>
    </div>
  )
}
