const DEFAULT_MAX_BYTES = 20 * 1024 * 1024

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(url)
    resolve(image)
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    reject(new Error('No pudimos procesar esta imagen. Prueba con otra fotografía.'))
  }
  image.src = url
})

const canvasBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('No pudimos comprimir la imagen.')),
    type,
    quality,
  )
})

/**
 * Reduce fotografías antes de enviarlas a Storage. SVG y GIF se conservan
 * para no perder vectores ni animación; el resto se normaliza a WebP.
 */
export async function compressImage(file, options = {}) {
  if (!(file instanceof Blob) || !file.type?.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen válido.')
  }
  const maxBytes = options.maxInputBytes || DEFAULT_MAX_BYTES
  if (file.size > maxBytes) {
    throw new Error('La imagen supera el límite de 20 MB.')
  }
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file

  const image = await loadImage(file)
  const maxWidth = options.maxWidth || 1600
  const maxHeight = options.maxHeight || 1600
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Tu dispositivo no pudo procesar la imagen.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)

  const blob = await canvasBlob(canvas, options.type || 'image/webp', options.quality || 0.82)
  if (blob.size >= file.size && scale === 1) return file
  return new File([blob], `${(file.name || 'imagen').replace(/\.[^.]+$/, '')}.webp`, {
    type: blob.type,
    lastModified: Date.now(),
  })
}

export async function prepareImageUpload(file, requestedPath, options = {}) {
  const compressed = await compressImage(file, options)
  const extension = compressed.type === 'image/webp'
    ? 'webp'
    : ((compressed.name || '').split('.').pop() || 'jpg').toLowerCase()
  const path = requestedPath.includes('.')
    ? requestedPath.replace(/\.[^./]+$/, `.${extension}`)
    : `${requestedPath}.${extension}`
  return { file: compressed, path }
}
