import { useEffect, useState } from 'react'

const BRAND = '#1B9E75'

const slides = [
  {
    image: 'onboarding/comunidad.webp',
    title: 'Tu barrio,\nen un solo lugar',
    subtitle: 'Conecta con tus vecinos, encuentra servicios, compra, vende y regala cerca de ti.',
  },
  {
    image: 'onboarding/confianza.webp',
    title: 'Confianza real entre vecinos',
    subtitle: 'Todos los vecinos son verificados. Sabes exactamente con quien interactuas.',
  },
  {
    image: 'onboarding/informado.webp',
    title: 'Tu barrio, siempre informado',
    subtitle: 'Alertas de seguridad, eventos, comercios, servicios y ofertas locales. Todo seguro y en tiempo real.',
  },
]

const CSS = `
@keyframes onboarding-photo-in {
  from { opacity: .45; transform: scale(1.035); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes onboarding-copy-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.onboarding-photo { animation: onboarding-photo-in .7s ease-out both; }
.onboarding-copy { animation: onboarding-copy-in .48s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .onboarding-photo, .onboarding-copy { animation: none; }
}
`

export default function Onboarding({ onFinish }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slide = slides[currentSlide]
  const isLastSlide = currentSlide === slides.length - 1

  useEffect(() => {
    slides.forEach(item => {
      const image = new Image()
      image.src = `${import.meta.env.BASE_URL}${item.image}`
    })
  }, [])

  const handleNext = () => {
    if (isLastSlide) onFinish()
    else setCurrentSlide(value => value + 1)
  }

  return (
    <div style={styles.container}>
      <style>{CSS}</style>
      <img
        key={slide.image}
        className="onboarding-photo"
        src={`${import.meta.env.BASE_URL}${slide.image}`}
        alt=""
        style={styles.photo}
      />
      <div style={styles.scrim} />

      <header style={styles.header}>
        <button type="button" style={styles.skip} onClick={onFinish}>Saltar</button>
      </header>

      <main key={currentSlide} className="onboarding-copy" style={styles.content}>
        <div style={styles.dotsRow}>
          <div style={styles.dots} aria-label={`Página ${currentSlide + 1} de ${slides.length}`}>
            {slides.map((_, index) => (
              <span key={index} style={{ ...styles.dot, ...(index === currentSlide ? styles.dotActive : {}) }} />
            ))}
          </div>
        </div>

        <h1 style={styles.title}>{slide.title}</h1>
        <p style={{ ...styles.subtitle, ...(currentSlide === 2 ? styles.subtitleCompact : {}) }}>{slide.subtitle}</p>
        <button type="button" style={styles.button} onClick={handleNext}>
          {isLastSlide ? 'Comenzar' : 'Siguiente'}
        </button>
      </main>
    </div>
  )
}

const styles = {
  container: {
    width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
    background: '#111713', color: '#fff', fontFamily: 'inherit',
  },
  photo: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center',
  },
  scrim: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,.06) 34%, rgba(9,12,10,.5) 58%, rgba(9,12,10,.96) 88%, #090c0a 100%)',
  },
  header: {
    position: 'absolute', zIndex: 2, top: 0, left: 0, right: 0,
    display: 'flex', justifyContent: 'flex-end',
    padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 20px 0',
  },
  skip: {
    minHeight: 38, padding: '0 17px', borderRadius: 999,
    border: '1px solid rgba(255,255,255,.45)', background: 'rgba(12,15,13,.26)',
    color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', cursor: 'pointer',
  },
  content: {
    position: 'absolute', zIndex: 2, left: 0, right: 0, bottom: 0,
    padding: '0 24px calc(env(safe-area-inset-bottom, 0px) + 28px)',
  },
  dotsRow: { minHeight: 22, marginBottom: 15, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' },
  dots: { display: 'flex', alignItems: 'center', gap: 6 },
  dot: {
    display: 'block', width: 6, height: 6, borderRadius: 999,
    background: 'rgba(255,255,255,.4)', transition: 'width .25s ease, background .25s ease',
  },
  dotActive: { width: 22, background: BRAND },
  title: {
    margin: 0, maxWidth: 330, color: '#fff',
    fontSize: 28, fontWeight: 800, lineHeight: 1.16, letterSpacing: '-.65px', textWrap: 'balance', whiteSpace: 'pre-line',
  },
  subtitle: {
    margin: '11px 0 22px', maxWidth: 338,
    color: 'rgba(255,255,255,.88)', fontSize: 15, fontWeight: 500, lineHeight: 1.5,
    textWrap: 'pretty', orphans: 2, widows: 2,
  },
  subtitleCompact: { fontSize: 12.5, lineHeight: 1.45, letterSpacing: '-.1px', maxWidth: '100%' },
  button: {
    width: '100%', minHeight: 54, borderRadius: 14,
    border: '1px solid rgba(255,255,255,.26)', background: BRAND,
    color: '#fff', fontSize: 15.5, fontWeight: 800, fontFamily: 'inherit',
    boxShadow: '0 10px 28px rgba(0,0,0,.28)', cursor: 'pointer',
  },
}
