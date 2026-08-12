import { supabase } from './supabase'

export async function getActiveAdvertisingCampaign(placement) {
  const { data, error } = await supabase.rpc('get_active_advertising_campaign', { p_placement: placement })
  if (error) {
    console.warn(`[advertising] ${placement} no disponible:`, error.message)
    return null
  }
  return data?.[0] || null
}
