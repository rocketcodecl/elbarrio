import { supabase } from './supabase'

const BLOCKED_CODE = 'CONTENT_BLOCKED'

export async function moderatePublicContent({ text, kind }) {
  const normalized = String(text || '').trim()
  if (!normalized) {
    return { allowed: true, decision: 'allow', categories: [] }
  }

  const { data, error } = await supabase.functions.invoke('moderate-community-content', {
    body: {
      text: normalized.slice(0, 4000),
      kind: String(kind || 'public_content').slice(0, 50),
    },
  })

  // La moderación es una capa preventiva, no debe dejar inutilizable la app
  // cuando OpenRouter o la Edge Function tienen una caída temporal.
  if (error || !data) {
    console.warn('[moderation] Servicio temporalmente no disponible:', error?.message || 'sin respuesta')
    return { allowed: true, decision: 'allow', degraded: true, categories: [] }
  }

  if (data.decision === 'block' || data.allowed === false) {
    const blocked = new Error(
      data.userMessage || 'Este contenido no puede publicarse porque incumple las reglas de convivencia.',
    )
    blocked.code = BLOCKED_CODE
    blocked.categories = Array.isArray(data.categories) ? data.categories : []
    throw blocked
  }

  return {
    allowed: true,
    decision: data.decision === 'review' ? 'review' : 'allow',
    categories: Array.isArray(data.categories) ? data.categories : [],
    degraded: data.degraded === true,
  }
}

export function isModerationBlock(error) {
  return error?.code === BLOCKED_CODE
}
