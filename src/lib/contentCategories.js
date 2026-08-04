import { supabase } from './supabase'

export async function getContentCategories(scope, fallback = []) {
  const { data, error } = await supabase
    .from('content_categories')
    .select('key, name, icon, description, expires_hours, sort_order')
    .eq('scope', scope)
    .eq('is_active', true)
    .order('sort_order')
    .order('name')
  if (error || !data?.length) return fallback
  return data.map(item => ({
    key: item.key,
    label: item.name,
    name: item.name,
    emoji: item.icon || '📌',
    description: item.description || '',
    expiresHours: item.expires_hours,
  }))
}
