import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'

export const MOBILE_AUTH_CALLBACK = 'lat.elbarrio.app://auth/callback'
export const isNativeApp = () => Capacitor.isNativePlatform()

export function authRedirectUrl(flow = 'oauth') {
  if (isNativeApp()) return `${MOBILE_AUTH_CALLBACK}?flow=${encodeURIComponent(flow)}`
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  if (flow === 'recovery') url.pathname = `${url.pathname.replace(/\/$/, '')}/recovery`
  return url.toString()
}

export async function openNativeAuth(url) {
  await Browser.open({ url, presentationStyle: 'popover' })
}

export async function finishNativeAuth(url) {
  if (!url?.startsWith(MOBILE_AUTH_CALLBACK)) return { handled: false, recovery: false }
  const parsed = new URL(url)
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const code = parsed.searchParams.get('code')
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  const recovery = parsed.searchParams.get('flow') === 'recovery' || hash.get('type') === 'recovery'

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (error) throw error
  } else {
    throw new Error('El enlace de acceso no contiene una sesión válida.')
  }

  try { await Browser.close() } catch { /* el navegador puede haberse cerrado solo */ }
  return { handled: true, recovery }
}
