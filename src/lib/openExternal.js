import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { normalizeHttpUrl } from '../../shared/externalUrl'

export const openExternalUrl = async value => {
  const url = normalizeHttpUrl(value)
  if (!url) return false
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  return true
}

export { normalizeHttpUrl }
