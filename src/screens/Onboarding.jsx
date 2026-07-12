import { useState } from 'react'

const slides = [
  {
    emoji: '🏘️',
    title: 'Tu barrio, en un solo lugar',
    subtitle: 'Conecta con tus vecinos, encuentra servicios, compra y vende cerca de ti.',
    color: '#138864',
  },
  {
    emoji: '🤝',
    title: 'Confianza real entre vecinos',
    subtitle: 'Todos los vecinos son verificados. Sabes exactamente con quién interactúas.',
    color: '#457B9D',
  },
  {
    emoji: '🔔',
    title: 'Tu barrio, siempre informado',
    subtitle: 'Alertas de seguridad, eventos, ofertas locales y más. En tiempo real.',
    color: '#F4A261',
  },
]

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
      {/* Skip button */}
      <div style={styles.header}>
        <button style={styles.skipButton} onClick={handleSkip}>
          Saltar
        </button>
      </div>

      {/* Contenido */}
      <div style={styles.content} className="fade-in" key={currentSlide}>
        <div style={{ ...styles.emojiWrapper, background: `${slide.color}15` }}>
          <span style={styles.emoji}>{slide.emoji}</span>
        </div>
        <h1 style={styles.title}>{slide.title}</h1>
        <p style={styles.subtitle}>{slide.subtitle}</p>
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
                background: index === currentSlide ? '#138864' : '#E5E7EB',
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
    background: '#FAFAF7',
    padding: '0 24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '50px',
    paddingBottom: '20px',
  },
  skipButton: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6B7280',
    padding: '8px 12px',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '0 12px',
  },
  emojiWrapper: {
    width: '160px',
    height: '160px',
    borderRadius: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '48px',
  },
  emoji: {
    fontSize: '80px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#1A1A1A',
    marginBottom: '16px',
    lineHeight: 1.2,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
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
    background: '#138864',
    color: 'white',
    borderRadius: '999px',
    fontSize: '16px',
    fontWeight: 700,
    boxShadow: '0 8px 20px rgba(19, 136, 100, 0.3)',
  },
}