import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { openExternalUrl } from '../lib/openExternal'
import { C } from '../lib/design'

const advertisingEventKey = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16)
    return (character === 'x' ? random : (random & 3) | 8).toString(16)
  })
}

export default function AdvertisingCard({ campaign, placement, compact = false }) {
  const impressionKey = useRef(advertisingEventKey())
  const touchStartX = useRef(null)
  const swiped = useRef(false)
  const availableImages = campaign?.image_urls?.filter(Boolean) || []
  const images = availableImages.length ? availableImages.slice(0, 3) : (campaign?.image_url ? [campaign.image_url] : [])
  const [activeImage, setActiveImage] = useState(0)
  const [creativeRatio, setCreativeRatio] = useState('1200 / 628')
  const firstImage = images[0] || ''

  useEffect(() => {
    if (!firstImage) return undefined
    let active = true
    const image = new Image()
    image.onload = () => {
      if (!active || !image.naturalWidth || !image.naturalHeight) return
      setCreativeRatio(image.naturalWidth / image.naturalHeight >= 3.2 ? '1200 / 220' : '1200 / 628')
    }
    image.src = firstImage
    return () => { active = false }
  }, [campaign?.id, firstImage])

  useEffect(() => {
    if (!campaign?.id) return
    supabase.rpc('record_advertising_event', {
      p_campaign_id: campaign.id,
      p_placement: placement,
      p_event_type: 'impression',
      p_event_key: impressionKey.current,
    }).then(({ error }) => {
      if (error) console.warn('[advertising] no se pudo registrar impresión:', error.message)
    })
  }, [campaign?.id, placement])

  useEffect(() => {
    if (images.length < 2) return undefined
    const timer = window.setInterval(() => setActiveImage(current => (current + 1) % images.length), 3600)
    return () => window.clearInterval(timer)
  }, [campaign?.id, images.length])

  if (!campaign || !images.length) return null
  const visibleImage = activeImage % images.length

  const openCampaign = async () => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    const opened = await openExternalUrl(campaign.cta_url)
    if (!opened) return
    supabase.rpc('record_advertising_event', {
      p_campaign_id: campaign.id,
      p_placement: placement,
      p_event_type: 'click',
      p_event_key: advertisingEventKey(),
    }).then(({ error }) => {
      if (error) console.warn('[advertising] no se pudo registrar clic:', error.message)
    })
  }

  const onTouchEnd = event => {
    if (touchStartX.current == null || images.length < 2) return
    const distance = event.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(distance) < 34) return
    swiped.current = true
    setActiveImage(current => distance < 0
      ? (current + 1) % images.length
      : (current - 1 + images.length) % images.length)
  }

  return (
    <button
      type="button"
      aria-label={`Publicidad de ${campaign.advertiser_name}. Abrir enlace`}
      style={{ ...styles.card, ...(compact ? styles.compact : {}) }}
      onClick={openCampaign}
    >
      <span
        style={{ ...styles.media, aspectRatio: creativeRatio }}
        onTouchStart={event => { touchStartX.current = event.touches[0].clientX; swiped.current = false }}
        onTouchEnd={onTouchEnd}
      >
        {images.map((url, index) => <img key={url} src={url} alt="" style={{ ...styles.image, opacity: index === visibleImage ? 1 : 0 }} />)}
        <span style={styles.label}>Publicidad</span>
        {images.length > 1 && <span style={styles.dots} aria-label={`Imagen ${visibleImage + 1} de ${images.length}`}>{images.map((url, index) => <i key={url} style={{ ...styles.dot, ...(index === visibleImage ? styles.activeDot : {}) }} />)}</span>}
      </span>
    </button>
  )
}

const styles = {
  card: {
    width: '100%', margin: '0 0 10px', padding: 0, overflow: 'hidden', display: 'block',
    border: `1px solid ${C.borde}`, borderRadius: 17, background: '#fff', color: C.texto,
    textAlign: 'left', appearance: 'none', WebkitAppearance: 'none', fontFamily: 'inherit',
    cursor: 'pointer', boxShadow: '0 3px 15px rgba(21,48,34,.045)', flexShrink: 0,
  },
  compact: { marginBottom: 12 },
  media: { position: 'relative', display: 'block', width: '100%', overflow: 'hidden', background: C.fondo, transition: 'aspect-ratio 180ms ease' },
  image: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 520ms ease' },
  label: { position: 'absolute', left: 9, top: 9, padding: '4px 7px', borderRadius: 999, background: 'rgba(17,32,24,.66)', color: '#fff', fontSize: 8, fontWeight: 750, letterSpacing: '.02em' },
  dots: { position: 'absolute', left: 0, right: 0, bottom: 7, display: 'flex', justifyContent: 'center', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.6)', boxShadow: '0 1px 3px rgba(0,0,0,.18)' },
  activeDot: { width: 13, background: '#fff' },
}
