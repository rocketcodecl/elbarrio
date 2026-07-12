import { useEffect } from 'react'

export default function Splash({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish()
    }, 2500)
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <div style={styles.container}>
      <div style={styles.logoBox} className="fade-in">
        <div style={styles.iconWrapper}>
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            {/* Isotipo El Barrio: dos figuras/arco */}
            <circle cx="30" cy="25" r="7" fill="white" />
            <circle cx="70" cy="25" r="7" fill="white" />
            <path
              d="M18 45 L18 78 L38 78 L38 60 Q38 55 43 55 L57 55 Q62 55 62 60 L62 78 L82 78 L82 45 Q82 38 75 38 L25 38 Q18 38 18 45 Z"
              fill="white"
            />
          </svg>
        </div>
        <div style={styles.textWrapper}>
          <span style={styles.text}>el barrio</span>
        </div>
      </div>
      <div style={styles.tagline} className="fade-in">
        Tu comunidad, en un solo lugar
      </div>
    </div>
  )
}

const styles = {
  container: {
    height: '100%',
    background: 'linear-gradient(180deg, #138864 0%, #0d6b4f 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  logoBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  iconWrapper: {
    width: '110px',
    height: '110px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  textWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  text: {
    fontSize: '38px',
    fontWeight: 800,
    letterSpacing: '-1px',
    color: 'white',
  },
  tagline: {
    position: 'absolute',
    bottom: '80px',
    fontSize: '14px',
    opacity: 0.85,
    fontWeight: 500,
  },
}