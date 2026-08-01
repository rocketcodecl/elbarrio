const header = document.querySelector('[data-header]')
const progress = document.querySelector('.progress span')
const menuButton = document.querySelector('[data-menu-button]')
const mobileNav = document.querySelector('[data-mobile-nav]')
const steps = [...document.querySelectorAll('[data-scene]')]
const panels = [...document.querySelectorAll('[data-scene-panel]')]
const storyVisuals = [...document.querySelectorAll('[data-scene-visual]')]
const hero = document.querySelector('.hero')
const heroLive = document.querySelector('.hero-live')
const heroVideo = document.querySelector('[data-hero-video]')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const cinemaScenes = [...document.querySelectorAll('[data-cinema-scene]')]
const cinemaVideos = [...document.querySelectorAll('[data-cinema-video]')]
const cinemaCount = document.querySelector('[data-cinema-count]')
const commerceScenes = [...document.querySelectorAll('[data-commerce-scene]')]
const commerceCount = document.querySelector('[data-commerce-count]')
const commerceProgress = document.querySelector('[data-commerce-progress]')
const commerceStatus = document.querySelector('[data-commerce-status]')

const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object)

async function loadPublishedContent() {
  try {
    const response = await fetch('content/site.json', { cache: 'no-store' })
    if (!response.ok) return
    const config = await response.json()

    document.querySelectorAll('[data-content]').forEach(element => {
      const value = getPath(config.content, element.dataset.content)
      if (typeof value === 'string' && value.trim()) element.textContent = value
    })

    const sizes = config.sizes || {}
    const root = document.documentElement.style
    if (Number.isFinite(Number(sizes.heroTitle))) root.setProperty('--hero-title-max', `${sizes.heroTitle}px`)
    if (Number.isFinite(Number(sizes.sectionTitle))) root.setProperty('--section-title-max', `${sizes.sectionTitle}px`)
    if (Number.isFinite(Number(sizes.body))) root.setProperty('--body-size', `${sizes.body}px`)
  } catch (_) {
    // La landing conserva su contenido integrado si la configuración no está disponible.
  }
}

loadPublishedContent()

function updatePageChrome() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0
  progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`
  header.classList.toggle('scrolled', window.scrollY > 30)
}

window.addEventListener('scroll', updatePageChrome, { passive: true })
updatePageChrome()

const ambientVideos = [heroVideo, ...cinemaVideos].filter(Boolean)

ambientVideos.forEach(video => video.play().catch(() => {}))

document.addEventListener('visibilitychange', () => {
  ambientVideos.forEach(video => {
    if (document.hidden) video.pause()
    else video.play().catch(() => {})
  })
})

if (hero && heroLive && window.matchMedia('(pointer:fine)').matches && !reduceMotion.matches) {
  hero.addEventListener('pointermove', event => {
    const x = (event.clientX / window.innerWidth - .5) * 6
    const y = (event.clientY / window.innerHeight - .5) * 5
    heroLive.style.transform = `translate3d(${x}px,${y}px,0) rotate(${1 + x * .08}deg)`
  })
  hero.addEventListener('pointerleave', () => {
    heroLive.style.transform = 'rotate(1deg)'
  })
}

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
  storyVisuals.forEach(visual => visual.classList.toggle('active', visual.dataset.sceneVisual === scene))
}

const storyObserver = new IntersectionObserver(entries => {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
  if (visible) setScene(visible.target.dataset.scene)
}, { rootMargin: '-28% 0px -48%', threshold: [0, .15, .35, .6] })

steps.forEach(step => storyObserver.observe(step))

const setCinemaScene = scene => {
  const key = scene.dataset.cinemaScene
  cinemaScenes.forEach(item => item.classList.toggle('active', item === scene))
  cinemaVideos.forEach(video => {
    const active = video.dataset.cinemaVideo === key
    video.classList.toggle('active', active)
    if (active) video.play().catch(() => {})
  })
  if (cinemaCount) cinemaCount.textContent = scene.dataset.count
}

const cinemaObserver = new IntersectionObserver(entries => {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
  if (visible) setCinemaScene(visible.target)
}, { rootMargin: '-34% 0px -34%', threshold: [0, .2, .5] })

cinemaScenes.forEach(scene => cinemaObserver.observe(scene))

const setCommerceScene = scene => {
  const index = commerceScenes.indexOf(scene)
  commerceScenes.forEach(item => item.classList.toggle('active', item === scene))
  if (commerceCount) commerceCount.textContent = scene.dataset.count
  if (commerceProgress) commerceProgress.style.width = `${((index + 1) / commerceScenes.length) * 100}%`
  if (commerceStatus) commerceStatus.textContent = scene.dataset.status
}

const commerceObserver = new IntersectionObserver(entries => {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
  if (visible) setCommerceScene(visible.target)
}, { rootMargin: '-30% 0px -42%', threshold: [0, .2, .45] })

commerceScenes.forEach(scene => commerceObserver.observe(scene))

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
