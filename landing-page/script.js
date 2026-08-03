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
const cinemaSection = document.querySelector('.cinema')
const cinemaStory = document.querySelector('.cinema-story')
const cinemaDevice = document.querySelector('[data-cinema-device]')
const journeyVisuals = [...document.querySelectorAll('[data-journey-visual]')]
const journeyVideos = journeyVisuals.filter(visual => visual.tagName === 'VIDEO')
const commerceScenes = [...document.querySelectorAll('[data-commerce-scene]')]
const commerceCount = document.querySelector('[data-commerce-count]')
const commerceProgress = document.querySelector('[data-commerce-progress]')
const commerceStatus = document.querySelector('[data-commerce-status]')
const commerceUis = [...document.querySelectorAll('[data-commerce-ui]')]
const commercePanels = [...document.querySelectorAll('[data-commerce-panel]')]
const serviceStoryScenes = [...document.querySelectorAll('[data-service-story-scene]')]
const serviceStoryUis = [...document.querySelectorAll('[data-service-story-ui]')]
const serviceStoryCount = document.querySelector('[data-service-story-count]')
const serviceStoryProgress = document.querySelector('[data-service-story-progress]')
const serviceStoryStatus = document.querySelector('[data-service-story-status]')
const servicePanels = [...document.querySelectorAll('[data-service-panel]')]

const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object)

async function loadPublishedContent() {
  try {
    const response = await fetch('content/site.json', { cache: 'no-store' })
    if (!response.ok) return
    const config = await response.json()

    document.querySelectorAll('[data-content]').forEach(element => {
      const value = getPath(config.content, element.dataset.content)
      if (typeof value === 'string' && value.trim()) {
        if (element.hasAttribute('data-heart-content')) {
          const [before, ...after] = value.split('♥')
          element.replaceChildren(document.createTextNode(before || 'Hecho con '))
          const heart = document.createElement('b')
          heart.className = 'footer-heart'
          heart.textContent = '♥'
          element.append(heart, document.createTextNode(after.length ? after.join('♥') : ' desde Santiago, CL.'))
        } else {
          element.textContent = value
        }
      }
    })
    document.querySelectorAll('[data-placeholder-content]').forEach(element => {
      const value = getPath(config.content, element.dataset.placeholderContent)
      if (typeof value === 'string' && value.trim()) element.setAttribute('placeholder', value)
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
  if (hero && cinemaSection) {
    const cinemaBounds = cinemaSection.getBoundingClientRect()
    hero.classList.toggle('journey-active', cinemaBounds.top < window.innerHeight * .72 && cinemaBounds.bottom > window.innerHeight * .2)
    if (cinemaBounds.top >= window.innerHeight * .72) {
      journeyVisuals.forEach(visual => {
        const active = visual.dataset.journeyVisual === 'hero'
        visual.classList.toggle('active', active)
        if (visual.tagName === 'VIDEO') {
          if (active) visual.play().catch(() => {})
          else visual.pause()
        }
      })
    }
  }
}

window.addEventListener('scroll', updatePageChrome, { passive: true })
updatePageChrome()

const ambientVideos = [...new Set([heroVideo, ...cinemaVideos, ...journeyVideos].filter(Boolean))]

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

let activeStoryScene = ''
const setScene = scene => {
  if (!scene || scene === activeStoryScene) return
  activeStoryScene = scene
  steps.forEach(step => step.classList.toggle('active', step.dataset.scene === scene))
  panels.forEach(panel => panel.classList.toggle('active', panel.dataset.scenePanel === scene))
  storyVisuals.forEach(visual => visual.classList.toggle('active', visual.dataset.sceneVisual === scene))
}

let storyFrame = 0
const updateStoryScene = () => {
  storyFrame = 0
  if (!steps.length) return
  const focus = window.innerHeight * .48
  const closest = steps.reduce((best, step) => {
    const rect = step.getBoundingClientRect()
    const distance = Math.abs(rect.top + rect.height / 2 - focus)
    return !best || distance < best.distance ? { step, distance } : best
  }, null)
  setScene(closest?.step.dataset.scene)
}
window.addEventListener('scroll', () => {
  if (!storyFrame) storyFrame = requestAnimationFrame(updateStoryScene)
}, { passive: true })
updateStoryScene()

let activeCinemaScene = ''
let cinemaDeviceAnimation = null
const setCinemaScene = scene => {
  const key = scene.dataset.cinemaScene
  if (!key || key === activeCinemaScene) return
  activeCinemaScene = key
  cinemaScenes.forEach(item => item.classList.toggle('active', item === scene))
  cinemaVideos.forEach(video => {
    const active = video.dataset.cinemaVideo === key
    video.classList.toggle('active', active)
    if (active) video.play().catch(() => {})
  })
  journeyVisuals.forEach(visual => {
    const active = visual.dataset.journeyVisual === key
    visual.classList.toggle('active', active)
    if (visual.tagName === 'VIDEO') {
      if (active) visual.play().catch(() => {})
      else visual.pause()
    }
  })
  if (cinemaCount) cinemaCount.textContent = scene.dataset.count
  if (cinemaDevice) {
    cinemaDevice.dataset.scene = key
    cinemaDeviceAnimation?.cancel()
    const deviceFrames = window.matchMedia('(max-width: 740px)').matches
      ? [{ opacity: .7, transform: 'translateY(5px) scale(.99)' }, { opacity: .88, transform: 'translateY(0) scale(1)' }]
      : [{ opacity: .7, transform: 'translateY(-46%) scale(.99)' }, { opacity: 1, transform: 'translateY(-47%) scale(1)' }]
    cinemaDeviceAnimation = cinemaDevice.animate(
      deviceFrames,
      { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' }
    )
  }
}

let cinemaFrame = 0
const updateCinemaScene = () => {
  cinemaFrame = 0
  if (!cinemaStory || !cinemaScenes.length) return
  const rect = cinemaStory.getBoundingClientRect()
  const focusInsideStory = window.innerHeight * .5 - rect.top
  const sceneHeight = cinemaScenes[0].getBoundingClientRect().height || window.innerHeight
  const index = Math.max(0, Math.min(cinemaScenes.length - 1, Math.floor(focusInsideStory / sceneHeight)))
  setCinemaScene(cinemaScenes[index])
}
window.addEventListener('scroll', () => {
  if (!cinemaFrame) cinemaFrame = requestAnimationFrame(updateCinemaScene)
}, { passive: true })
window.addEventListener('resize', updateCinemaScene)
updateCinemaScene()

let activeCommerceScene = ''
const setCommerceScene = scene => {
  if (!scene || scene.dataset.count === activeCommerceScene) return
  activeCommerceScene = scene.dataset.count
  const index = commerceScenes.indexOf(scene)
  commerceScenes.forEach(item => item.classList.toggle('active', item === scene))
  commerceUis.forEach(item => item.classList.toggle('active', item.dataset.commerceUi === scene.dataset.count))
  commercePanels.forEach(item => item.classList.toggle('active', item.dataset.commercePanel === scene.dataset.count))
  if (commerceCount) commerceCount.textContent = scene.dataset.count
  if (commerceProgress) commerceProgress.style.width = `${((index + 1) / commerceScenes.length) * 100}%`
  if (commerceStatus) commerceStatus.textContent = scene.dataset.status
}

let activeServiceStoryScene = ''
const setServiceStoryScene = scene => {
  if (!scene || scene.dataset.count === activeServiceStoryScene) return
  activeServiceStoryScene = scene.dataset.count
  const index = serviceStoryScenes.indexOf(scene)
  serviceStoryScenes.forEach(item => item.classList.toggle('active', item === scene))
  serviceStoryUis.forEach(item => item.classList.toggle('active', item.dataset.serviceStoryUi === scene.dataset.count))
  servicePanels.forEach(item => item.classList.toggle('active', item.dataset.servicePanel === scene.dataset.count))
  if (serviceStoryCount) serviceStoryCount.textContent = scene.dataset.count
  if (serviceStoryProgress) serviceStoryProgress.style.width = `${((index + 1) / serviceStoryScenes.length) * 100}%`
  if (serviceStoryStatus) serviceStoryStatus.textContent = scene.dataset.status
}

const closestSceneToFocus = scenes => {
  const focus = window.innerHeight * .5
  return scenes.reduce((best, scene) => {
    const rect = scene.getBoundingClientRect()
    const distance = Math.abs(rect.top + rect.height / 2 - focus)
    return !best || distance < best.distance ? { scene, distance } : best
  }, null)?.scene
}

let businessStoryFrame = 0
const updateBusinessStories = () => {
  businessStoryFrame = 0
  setCommerceScene(closestSceneToFocus(commerceScenes))
  setServiceStoryScene(closestSceneToFocus(serviceStoryScenes))
}

window.addEventListener('scroll', () => {
  if (!businessStoryFrame) businessStoryFrame = requestAnimationFrame(updateBusinessStories)
}, { passive: true })
updateBusinessStories()

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
  const note = form.querySelector('[data-form-note]')
  const button = form.querySelector('button[type="submit"]')
  button.disabled = true
  button.textContent = 'Guardando…'
  fetch('leads.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(data)),
  })
    .then(async response => {
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) throw new Error(result.message || 'No pudimos guardar tus datos.')
      note.textContent = result.message
      note.classList.add('success')
      form.reset()
    })
    .catch(error => {
      note.textContent = error.message
      note.classList.remove('success')
    })
    .finally(() => {
      button.disabled = false
      button.innerHTML = 'Quiero acceso anticipado <span>→</span>'
    })
})
