export const normalizeHttpUrl = value => {
  const raw = String(value || '').trim()
  if (!raw) return null
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(candidate)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null
    return parsed.toString()
  } catch {
    return null
  }
}
