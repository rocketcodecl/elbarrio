import { useEffect } from 'react'

export default function Splash({ onFinish }) {
  useEffect(() => {
    ;['comunidad.webp', 'confianza.webp', 'informado.webp'].forEach(file => {
      const image = new Image()
      image.src = `${import.meta.env.BASE_URL}onboarding/${file}`
    })
    const timer = setTimeout(() => {
      onFinish()
    }, 2500)
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <div style={styles.container}>
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
        .splash-isotipo-base { animation: splashBaseEnter .48s ease-out both; }
        .splash-isotipo-dots { animation: splashDotsRise 1.08s cubic-bezier(.22,1,.36,1) .16s both; }
        .splash-copy { animation: splashCopyEnter .5s ease-out .42s both; }
      `}</style>
      <div style={styles.logoBox}>
        <div style={styles.iconWrapper}>
          <img className="splash-isotipo-base" src={`${import.meta.env.BASE_URL}isotipo.png`} alt="" style={{ ...styles.isotipoLayer, clipPath: 'inset(32% 0 0 0)' }} />
          <img className="splash-isotipo-dots" src={`${import.meta.env.BASE_URL}isotipo.png`} alt="" style={{ ...styles.isotipoLayer, clipPath: 'inset(0 0 68% 0)' }} />
        </div>
        <div className="splash-copy" style={styles.textWrapper}>
          <span style={styles.text}>el barrio</span>
        </div>
      </div>
      <div style={styles.tagline} className="splash-copy">
        Tu comunidad, en un solo lugar
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
    gap: '2px',
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
  textWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  text: {
    fontSize: '38px',
    fontWeight: 800,
    letterSpacing: '-1px',
    color: '#fff',
  },
  tagline: {
    position: 'absolute',
    bottom: '80px',
    fontSize: '14px',
    color: 'rgba(255,255,255,.86)', opacity: 1,
    fontWeight: 500,
  },
}
