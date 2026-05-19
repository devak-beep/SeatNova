import { supabase } from './supabase'

export async function saveVenue(storeState, venueId = null) {
  const { venueName, venueShape, fieldType, canvasSize, fieldX, fieldY, fieldScale,
          stageX, stageY, stageW, stageH, categories, sections } = storeState

  const { data: { user } } = await supabase.auth.getUser()

  const payload = {
    user_id: user.id,
    name: venueName,
    shape: venueShape,
    field_type: fieldType,
    canvas_size: canvasSize,
    field_x: fieldX, field_y: fieldY, field_scale: fieldScale,
    stage_x: stageX, stage_y: stageY, stage_w: stageW, stage_h: stageH,
    categories,
    sections,
    updated_at: new Date().toISOString(),
  }

  if (venueId) payload.id = venueId

  const { data, error } = await supabase
    .from('venues')
    .upsert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function loadVenues() {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, updated_at')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data
}

export async function loadVenue(id) {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function deleteVenue(id) {
  const { error } = await supabase.from('venues').delete().eq('id', id)
  if (error) throw error
}

export async function duplicateVenue(id) {
  const { data: v, error } = await supabase.from('venues').select('*').eq('id', id).single()
  if (error) throw error

  const { data, error: err } = await supabase
    .from('venues')
    .insert({ ...v, id: undefined, name: `${v.name} (Copy)`, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (err) throw err
  return data
}
