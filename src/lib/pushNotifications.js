import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabase'

const CHANNEL_ID = 'el-barrio-general'

export async function setupPushNotifications({ onOpen }) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return () => {}

  const handles = await Promise.all([
    PushNotifications.addListener('registration', async ({ value }) => {
      const { error } = await supabase.rpc('register_push_device', {
        p_token: value,
        p_platform: 'android',
      })
      if (error) console.warn('[push] no se pudo registrar el dispositivo:', error.message)
    }),
    PushNotifications.addListener('registrationError', error => {
      console.warn('[push] registro nativo falló:', error?.error || error)
    }),
    PushNotifications.addListener('pushNotificationActionPerformed', action => {
      const data = action?.notification?.data || {}
      onOpen?.(data)
    }),
  ])

  await PushNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'El Barrio',
    description: 'Novedades y avisos importantes de tu barrio.',
    importance: 4,
    visibility: 1,
    vibration: true,
  })

  let permission = await PushNotifications.checkPermissions()
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions()
  }
  if (permission.receive === 'granted') await PushNotifications.register()

  return () => handles.forEach(handle => handle.remove())
}

