const form = document.querySelector('[data-editor-form]')
const saveButton = document.querySelector('[data-save]')
const resetButton = document.querySelector('[data-reset]')
const status = document.querySelector('[data-status]')
const toast = document.querySelector('[data-toast]')
const csrf = document.querySelector('meta[name="csrf-token"]')?.content || ''

const setPath = (object, path, value) => {
  const keys = path.split('.')
  const final = keys.pop()
  const target = keys.reduce((branch, key) => (branch[key] ||= {}), object)
  target[final] = value
}

const notify = (message, error = false) => {
  toast.textContent = message
  toast.classList.toggle('error', error)
  toast.classList.add('visible')
  window.setTimeout(() => toast.classList.remove('visible'), 3200)
}

const request = async payload => {
  const response = await fetch('api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify(payload),
  })
  const result = await response.json().catch(() => ({ ok: false, message: 'Respuesta inválida del servidor.' }))
  if (!response.ok || !result.ok) throw new Error(result.message || 'No fue posible completar la acción.')
  return result
}

const serialize = () => {
  const data = {}
  new FormData(form).forEach((value, name) => setPath(data, name, value))
  return data
}

form?.addEventListener('input', event => {
  status.textContent = 'Cambios sin publicar'
  status.classList.add('dirty')
  if (event.target.type === 'range') {
    const output = document.querySelector(`[data-output="${event.target.name}"]`)
    if (output) output.textContent = `${event.target.value} px`
  }
})

saveButton?.addEventListener('click', async () => {
  saveButton.disabled = true
  saveButton.textContent = 'Publicando…'
  try {
    const result = await request({ action: 'save', data: serialize() })
    status.textContent = 'Publicado'
    status.classList.remove('dirty')
    notify(result.message)
  } catch (error) {
    notify(error.message, true)
  } finally {
    saveButton.disabled = false
    saveButton.textContent = 'Publicar cambios'
  }
})

resetButton?.addEventListener('click', async () => {
  if (!window.confirm('¿Restaurar todos los textos y tamaños originales?')) return
  try {
    const result = await request({ action: 'reset' })
    notify(result.message)
    window.setTimeout(() => window.location.reload(), 500)
  } catch (error) {
    notify(error.message, true)
  }
})
