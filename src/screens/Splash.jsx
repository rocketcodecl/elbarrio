import { useEffect, useRef, useState } from 'react'

export default function Splash({ onFinish }) {
  const [leaving, setLeaving] = useState(false)
  const onFinishRef = useRef(onFinish)

  useEffect(() => { onFinishRef.current = onFinish }, [onFinish])

  useEffect(() => {
    let active = true
    const images = ['comunidad.webp', 'confianza.webp', 'informado.webp'].map(file => {
      const image = new Image()
      image.src = `${import.meta.env.BASE_URL}onboarding/${file}`
      return image
    })
    const firstImageReady = images[0].decode
      ? images[0].decode().catch(() => undefined)
      : new Promise(resolve => {
        images[0].onload = resolve
        images[0].onerror = resolve
      })
    const exitTimer = setTimeout(() => setLeaving(true), 2650)
    const finishTimer = setTimeout(() => {
      firstImageReady.then(() => { if (active) onFinishRef.current() })
    }, 3000)
    return () => {
      active = false
      clearTimeout(exitTimer)
      clearTimeout(finishTimer)
    }
  }, [])

  return (
    <div className={leaving ? 'splash-screen splash-screen--leaving' : 'splash-screen'} style={styles.container}>
      <style>{`
        @keyframes splashBaseEnter {
          0% { opacity: 0; transform: scale(.88); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashDotsRise {
          0% { opacity: 0; transform: translateY(118px); }
          68% { opacity: 1; transform: translateY(-7px); }
          84% { transform: translateY(3px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashCopyEnter {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashExit {
          0% { opacity: 1; transform: scale(1); filter: brightness(1); }
          55% { opacity: 1; transform: scale(1.035); filter: brightness(1.12); }
          100% { opacity: 1; transform: scale(1.08); filter: brightness(1.18); }
        }
        .splash-screen { transform-origin: center; }
        .splash-screen--leaving { animation: splashExit .35s cubic-bezier(.4,0,.2,1) both; }
        .splash-isotipo-base { animation: splashBaseEnter .48s ease-out both; }
        .splash-isotipo-dots { animation: splashDotsRise 1.08s cubic-bezier(.22,1,.36,1) .16s both; }
        .splash-pillar { position: absolute; opacity: 0; animation: splashPillar 3s ease-in-out both; }
        .splash-pillar:nth-child(2) { animation-delay: 1s; }
        .splash-pillar:nth-child(3) { animation-delay: 2s; }
        @keyframes splashPillar {
          0% { opacity: 0; transform: translateY(7px); }
          10%, 26% { opacity: 1; transform: translateY(0); }
          33%, 100% { opacity: 0; transform: translateY(-5px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-screen--leaving { animation: none; opacity: 1; }
        }
      `}</style>
      <div style={styles.logoBox}>
        <div style={styles.iconWrapper}>
          <img className="splash-isotipo-base" src={`${import.meta.env.BASE_URL}isotipo.png`} alt="" style={{ ...styles.isotipoLayer, clipPath: 'inset(32% 0 0 0)' }} />
          <img className="splash-isotipo-dots" src={`${import.meta.env.BASE_URL}isotipo.png`} alt="" aria-hidden="true" style={{ ...styles.isotipoLayer, clipPath: 'inset(0 0 68% 0)' }} />
        </div>
        <div style={styles.wordmarkWrapper}>
          <img src={`${import.meta.env.BASE_URL}logo-w.png`} alt="El Barrio" style={styles.wordmark} />
        </div>
        <div style={styles.pillars} aria-label="Confianza, Seguridad y Cercanía">
          <span className="splash-pillar">CONFIANZA</span>
          <span className="splash-pillar">SEGURIDAD</span>
          <span className="splash-pillar">CERCANÍA</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    height: '100%',
    background: '#1B9E75',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
  logoBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
  },
  iconWrapper: {
    width: '150px',
    height: '104px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  isotipoLayer: {
    position: 'absolute', zIndex: 2,
    width: '92px', height: '92px', objectFit: 'contain',
    filter: 'brightness(0) invert(1)',
  },
  wordmarkWrapper: {
    position: 'relative',
    width: '194px',
    height: '44px',
    overflow: 'hidden',
  },
  wordmark: {
    position: 'absolute',
    width: '247px',
    height: '44px',
    maxWidth: 'none',
    objectFit: 'fill',
    left: '-53px',
    top: 0,
  },
  pillars: {
    position: 'relative',
    width: '100%',
    height: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'rgba(255,255,255,.9)',
    marginTop: '8px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '1.5px',
  },
}
