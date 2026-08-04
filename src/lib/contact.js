export const EL_BARRIO_WHATSAPP = '56935304705'

export const whatsappUrl = message => `https://api.whatsapp.com/send?phone=${EL_BARRIO_WHATSAPP}&text=${encodeURIComponent(message)}`

export const openWhatsApp = message => {
  const encoded = encodeURIComponent(message)
  const fallback = whatsappUrl(message)
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (!mobile) {
    window.open(fallback, '_blank', 'noopener,noreferrer')
    return
  }
  window.location.href = `whatsapp://send?phone=${EL_BARRIO_WHATSAPP}&text=${encoded}`
  window.setTimeout(() => {
    if (!document.hidden) window.location.href = fallback
  }, 900)
}
