import { useState } from 'react'

// ============================================================
// Onboarding v2 — verde de marca + texto blanco + emoji animado.
// Cero Lottie, cero dependencias externas. Animaciones CSS puras
// (float / pulse / ring) segun el slide. Autocontenido: incluye
// sus propios keyframes en un <style> tag para no depender de
// index.css.
// ============================================================

const slides = [
  {
    emoji: '🏡',
    title: 'Tu barrio, en un solo lugar',
    subtitle: 'Conecta con tus vecinos, encuentra servicios, compra y vende cerca de ti.',
    anim: 'onb-float', // sube y baja suave
  },
  {
    emoji: '🤝',
    title: 'Confianza real entre vecinos',
    subtitle: 'Todos los vecinos son verificados. Sabes exactamente con quien interactuas.',
    anim: 'onb-wave', // tilda suave como saludando (no pulsa, no tira)
  },
  {
    emoji: '🔔',
    title: 'Tu barrio, siempre informado',
    subtitle: 'Alertas de seguridad, eventos, ofertas locales y mas. En tiempo real.',
    anim: 'onb-ring', // vibra rapido + pausa (alerta)
    alert: true, // activa halo rojo + ripples
  },
]

// Keyframes inyectados una sola vez
const KEYFRAMES = `
@keyframes onb-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}
/* Wave: tilda suave de un lado a otro, como saludando.
   Mas lento (3.5s) y ease-in-out para que NO tire ni tiemble. */
@keyframes onb-wave {
  0%, 100% { transform: rotate(-7deg); }
  50% { transform: rotate(7deg); }
}
/* Ring: vibra rapido 2 veces, pausa larga, repite. Sensacion de alerta. */
@keyframes onb-ring {
  0%, 70%, 100% { transform: rotate(0deg); }
  72% { transform: rotate(14deg); }
  74% { transform: rotate(-14deg); }
  76% { transform: rotate(12deg); }
  78% { transform: rotate(-10deg); }
  80% { transform: rotate(0deg); }
}
@keyframes onb-pop {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes onb-fade-up {
  0% { transform: translateY(12px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
/* Halo rojo pulsante para el slide de alerta */
@keyframes onb-halo {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}
/* Ripples: 2 ondas que se expanden desde el centro hacia afuera */
@keyframes onb-ripple {
  0% { transform: scale(0.6); opacity: 0.5; }
  100% { transform: scale(1.8); opacity: 0; }
}
.onb-emoji { display: inline-block; transform-origin: center; }
.onb-pop { animation: onb-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.onb-fade-up { animation: onb-fade-up 0.5s ease both; }
.onb-fade-up-2 { animation: onb-fade-up 0.5s ease 0.1s both; }
`

export default function Onboarding({ onFinish }) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const isLastSlide = currentSlide === slides.length - 1

  const handleNext = () => {
    if (isLastSlide) {
      onFinish()
    } else {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const handleSkip = () => {
    onFinish()
  }

  const slide = slides[currentSlide]

  return (
    <div style={styles.container}>
      {/* Keyframes (se inyectan una vez) */}
      <style>{KEYFRAMES}</style>

      {/* Glow deco esquina sup-der */}
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      {/* Skip button */}
      <div style={styles.header}>
        <button style={styles.skipButton} onClick={handleSkip}>
          Saltar
        </button>
      </div>

      {/* Contenido — key fuerza re-mount para re-disparar animaciones */}
      <div style={styles.content} key={currentSlide}>
        <div style={styles.emojiWrapper}>
          {/* Halo rojo pulsante (solo slide de alerta) */}
          {slide.alert && (
            <span style={styles.halo} />
          )}
          {/* Ripples expandiendose (solo slide de alerta) */}
          {slide.alert && (
            <>
              <span style={{ ...styles.ripple, animationDelay: '0s' }} />
              <span style={{ ...styles.ripple, animationDelay: '0.7s' }} />
            </>
          )}
          <span
            className="onb-emoji onb-pop"
            style={{
              ...styles.emoji,
              animation: `onb-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both, ${slide.anim} ${slide.alert ? '2.2s' : '3.5s'} ease-in-out 0.5s infinite`,
              position: 'relative',
              zIndex: 2,
            }}
          >
            {slide.emoji}
          </span>
        </div>
        <h1 className="onb-fade-up" style={styles.title}>{slide.title}</h1>
        <p className="onb-fade-up-2" style={styles.subtitle}>{slide.subtitle}</p>
      </div>

      {/* Dots + botón */}
      <div style={styles.footer}>
        <div style={styles.dots}>
          {slides.map((_, index) => (
            <div
              key={index}
              style={{
                ...styles.dot,
                width: index === currentSlide ? '24px' : '8px',
                background: index === currentSlide ? '#ffffff' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>

        <button style={styles.button} onClick={handleNext}>
          {isLastSlide ? 'Comenzar' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    // Verde de marca con gradiente sutil para dar profundidad
    background: 'linear-gradient(160deg, #0f5f36 0%, #138864 60%, #0f5f36 100%)',
    padding: '0 24px',
    position: 'relative',
    overflow: 'hidden',
  },
  // Glows deco: circulos blancos translucidos que dan fondo vivo
  glow1: {
    position: 'absolute',
    top: '-80px',
    right: '-60px',
    width: '240px',
    height: '240px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
    pointerEvents: 'none',
  },
  glow2: {
    position: 'absolute',
    bottom: '-100px',
    left: '-80px',
    width: '280px',
    height: '280px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '50px',
    paddingBottom: '20px',
    position: 'relative',
    zIndex: 2,
  },
  skipButton: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.85)',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '999px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s ease',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '0 12px',
    position: 'relative',
    zIndex: 2,
  },
  emojiWrapper: {
    width: '180px',
    height: '180px',
    borderRadius: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '48px',
    // Glassmorphism: blanco translucido con blur
    background: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.25)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)',
    position: 'relative',
    overflow: 'visible',
  },
  // Halo rojo: circulo detras del emoji que pulsa (solo slide alerta)
  halo: {
    position: 'absolute',
    inset: '20px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(220,38,38,0.55) 0%, rgba(220,38,38,0) 70%)',
    animation: 'onb-halo 1.6s ease-in-out infinite',
    zIndex: 1,
    pointerEvents: 'none',
  },
  // Ripples: ondas rojas que se expanden desde el centro hacia afuera
  ripple: {
    position: 'absolute',
    inset: '0',
    borderRadius: '48px',
    border: '2px solid rgba(248,113,113,0.6)',
    animation: 'onb-ripple 1.6s ease-out infinite',
    zIndex: 1,
    pointerEvents: 'none',
  },
  emoji: {
    fontSize: '88px',
    lineHeight: 1,
    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: '16px',
    lineHeight: 1.2,
    letterSpacing: '-0.5px',
    textShadow: '0 2px 8px rgba(0,0,0,0.18)',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 1.5,
    maxWidth: '300px',
    fontWeight: 400,
  },
  footer: {
    paddingBottom: '50px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    position: 'relative',
    zIndex: 2,
  },
  dots: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  dot: {
    height: '8px',
    borderRadius: '4px',
    transition: 'all 0.3s ease',
  },
  button: {
    width: '100%',
    padding: '18px',
    // Boton blanco con texto verde para invertir y destacar sobre fondo verde
    background: '#ffffff',
    color: '#0f5f36',
    border: 'none',
    borderRadius: '999px',
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.5)',
    transition: 'transform 0.12s ease',
  },
}
