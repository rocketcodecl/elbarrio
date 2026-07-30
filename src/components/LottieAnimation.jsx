import { useEffect, useRef } from 'react'
import lottie from 'lottie-web'

export default function LottieAnimation({ src, style }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      path: src,
      renderer: 'svg',
      loop: true,
      autoplay: true,
    })

    return () => anim.destroy()
  }, [src])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', ...style }} />
}