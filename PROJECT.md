# SeatNova — Venue Layout Builder

## The Problem

Every time a developer needs to build a seat selection UI for a new venue — a cricket stadium, football ground, concert hall, theatre, or any event space — they have to start from scratch. Drawing sections, placing seats, handling interactions, wiring up pricing — it's the same work repeated every time. That's wasted effort.

## What SeatNova Is

SeatNova is a **visual venue layout builder** — like Figma, but specifically for designing interactive seat maps.

A developer (or even a non-technical event organizer) opens SeatNova, draws their venue layout using simple tools, configures sections and seats, and exports a ready-to-embed HTML/JS component. No manual SVG writing. No custom canvas code. Just design and export.

---

## Who It's For

- **Developers** building ticketing platforms who don't want to hand-code every venue layout
- **Event organizers / venue managers** who want to self-serve their seat map without hiring a developer each time
- **Ticketing SaaS products** that need to support multiple venue types (sports, concerts, theatre, etc.)

---

## Core Concepts

### Venue
The root canvas. Represents the physical space — stadium, arena, ground, hall. Has a shape (circular, rectangular, custom) and a playing field / stage at the center.

### Section
A named zone within the venue (e.g. `WL1`, `EU3`, `Premium East`). Has:
- A shape drawn on the canvas (polygon, arc segment, rectangle)
- A category (Premium / Gold / Silver / General or custom)
- A color
- A price
- A seat count or individual seat layout

### Seat
An individual bookable unit inside a section. Has a row, number, status (available / booked / blocked), and price.

### Field / Stage
The center element of the venue. Predefined shapes:
- Cricket pitch
- Football ground
- Basketball court
- Concert stage
- Custom (free draw)

---

## Builder Features

### Canvas Tools
- **Select** — click and move sections/seats
- **Draw Section** — draw polygon or arc sections on the canvas
- **Arc Tool** — for circular stadiums, draw curved sections by angle
- **Rectangle Tool** — for rectangular venues (theatres, halls)
- **Field Picker** — drop a pre-built field/stage at the center

### Section Editor (right panel)
- Set section name, category, color, base price
- Choose seat layout: auto-fill rows & columns, or manual
- Set seat count, row count, seats per row

### Venue Settings (left panel)
- Venue name
- Venue shape: circular / rectangular / custom
- Total capacity (auto-calculated)
- Category definitions (name + color + price range)

### Layers Panel
- List of all sections
- Show/hide, lock, reorder sections
- Group sections into tiers

---

## Export

The builder exports a self-contained, embeddable output:

### HTML Export
A single `.html` file with inline SVG + JS. Drop it anywhere, works without any framework.

### JS/JSON Export
- `venue.json` — the full venue data schema (sections, seats, categories, field type)
- `SeatMap.jsx` — a ready-to-use React component that consumes the JSON
- The component handles: hover, click-to-select, tooltip, color-by-category, available/booked states

### Embed Code
A one-liner `<script>` tag + `<div>` that loads the seat map on any webpage.

---

## Supported Venue Types (out of the box)

| Venue Type | Field Shape | Layout Shape |
|---|---|---|
| Cricket Stadium | Oval pitch | Circular sections |
| Football Ground | Rectangular pitch | Rectangular/curved stands |
| Basketball Arena | Court | Rectangular bowl |
| Concert / Festival | Stage | Fan-shaped or rectangular |
| Theatre / Auditorium | Stage | Curved rows |
| Custom | Free draw | Free draw |

---

## Data Schema (venue.json)

```json
{
  "venue": {
    "name": "Narendra Modi Stadium",
    "shape": "circular",
    "field": "cricket"
  },
  "categories": [
    { "id": "premium", "label": "Premium", "color": "#f59e0b" },
    { "id": "general", "label": "General", "color": "#94a3b8" }
  ],
  "sections": [
    {
      "id": "WL1",
      "label": "WL1",
      "category": "premium",
      "price": 5843,
      "totalSeats": 120,
      "availableSeats": 20,
      "shape": { "type": "arc", "startAngle": 200, "endAngle": 220, "innerR": 0.45, "outerR": 0.6 }
    }
  ]
}
```

---

## Tech Stack

- **React** — builder UI
- **SVG / Canvas** — venue canvas rendering (SVG for builder, Canvas for high-seat-count export)
- **Zustand** — builder state (sections, selected element, tool mode)
- **No map dependency** — zero Mapbox, zero external map tiles, no token needed

---

## Project Phases

### Phase 1 — Core Builder (MVP)
- [ ] Canvas with circular and rectangular venue shapes
- [ ] Draw sections manually (arc tool + rect tool)
- [ ] Section properties panel (name, color, category, price, seat count)
- [ ] Pre-built field/stage shapes (cricket, football, stage)
- [ ] Export as `venue.json`

### Phase 2 — Seat-Level Editing
- [ ] Auto-fill seats inside a section (rows × columns)
- [ ] Individual seat status (available / booked / blocked)
- [ ] Export as embeddable React component

### Phase 3 — Export & Embed
- [ ] Single-file HTML export
- [ ] `<script>` embed code generator
- [ ] Live preview mode (simulate the end-user seat selection experience)

### Phase 4 — Templates & Polish
- [ ] Pre-built venue templates (cricket stadium, football ground, concert hall)
- [ ] Undo/redo
- [ ] Keyboard shortcuts
- [ ] Mobile-friendly preview

---

## What SeatNova is NOT

- Not a ticketing platform (no payments, no bookings)
- Not a 3D viewer
- Not a real-time availability system

It is purely a **layout design and export tool**. The exported output plugs into whatever ticketing backend the developer already has.
