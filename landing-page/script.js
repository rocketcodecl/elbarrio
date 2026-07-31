const header = document.querySelector('[data-header]')
const progress = document.querySelector('.progress span')
const menuButton = document.querySelector('[data-menu-button]')
const mobileNav = document.querySelector('[data-mobile-nav]')
const steps = [...document.querySelectorAll('[data-scene]')]
const panels = [...document.querySelectorAll('[data-scene-panel]')]

function updatePageChrome() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0
  progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`
  header.classList.toggle('scrolled', window.scrollY > 30)
}

window.addEventListener('scroll', updatePageChrome, { passive: true })
updatePageChrome()

menuButton?.addEventListener('click', () => {
  const open = !menuButton.classList.contains('open')
  menuButton.classList.toggle('open', open)
  mobileNav.classList.toggle('open', open)
  document.body.classList.toggle('menu-open', open)
  menuButton.setAttribute('aria-expanded', String(open))
  menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú')
})

mobileNav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    menuButton.classList.remove('open')
    mobileNav.classList.remove('open')
    document.body.classList.remove('menu-open')
    menuButton.setAttribute('aria-expanded', 'false')
  })
})

const setScene = scene => {
  steps.forEach(step => step.classList.toggle('active', step.dataset.scene === scene))
  panels.forEach(panel => panel.classList.toggle('active', panel.dataset.scenePanel === scene))
}

const storyObserver = new IntersectionObserver(entries => {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
  if (visible) setScene(visible.target.dataset.scene)
}, { rootMargin: '-28% 0px -48%', threshold: [0, .15, .35, .6] })

steps.forEach(step => storyObserver.observe(step))

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return
    entry.target.classList.add('visible')
    revealObserver.unobserve(entry.target)
  })
}, { threshold: .16 })

document.querySelectorAll('.reveal').forEach(item => revealObserver.observe(item))

document.querySelector('[data-join-form]')?.addEventListener('submit', event => {
  event.preventDefault()
  const form = event.currentTarget
  const data = new FormData(form)
  const name = String(data.get('nombre') || '').trim()
  const email = String(data.get('correo') || '').trim()
  const type = String(data.get('tipo') || 'Vecino')
  const subject = encodeURIComponent(`Quiero ser parte de El Barrio como ${type}`)
  const body = encodeURIComponent(`Hola, soy ${name}.\n\nQuiero participar en El Barrio como ${type}.\nMi correo es ${email}.\n\nEnviado desde la landing de El Barrio.`)
  const note = form.querySelector('[data-form-note]')
  note.textContent = '¡Gracias! Abriremos tu correo para completar el contacto.'
  note.classList.add('success')
  window.setTimeout(() => {
    window.location.href = `mailto:elbarrio.lat@gmail.com?subject=${subject}&body=${body}`
  }, 350)
})
