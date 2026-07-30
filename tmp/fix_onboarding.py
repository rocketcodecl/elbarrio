#!/usr/bin/env python3
with open('/Users/fenha/Desktop/elbarrio/src/screens/Onboarding.jsx', 'r') as f:
    content = f.read()

# 1. Remove KEYFRAMES style block
old1 = '''      {/* Keyframes (se inyectan una vez) */}
      <style>{KEYFRAMES}</style>

      {/* Glow deco esquina sup-der */}'''
new1 = '''      {/* Glow deco esquina sup-der */}'''
if old1 in content:
    content = content.replace(old1, new1, 1)
    print('Step 1: KEYFRAMES removed')
else:
    print('Step 1: KEYFRAMES pattern NOT found')

# 2. Replace content block (emoji/alert/anim -> LottieAnimation)
old2 = '''      <div style={styles.content} key={currentSlide}>
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
      </div>'''

new2 = '''      <div style={styles.content} key={currentSlide}>
        <div style={styles.emojiWrapper}>
          <LottieAnimation src={slide.lottie} style={{ width: '140px', height: '140px' }} />
        </div>
        <h1 className="onb-fade-up" style={styles.title}>{slide.title}</h1>
        <p className="onb-fade-up-2" style={styles.subtitle}>{slide.subtitle}</p>
      </div>'''

count2 = content.count(old2)
print(f'Step 2: Found content block x{count2}')
if count2 > 0:
    content = content.replace(old2, new2, 1)
    print('Step 2: Content block replaced')
else:
    print('Step 2: Content block NOT found')

with open('/Users/fenha/Desktop/elbarrio/src/screens/Onboarding.jsx', 'w') as f:
    f.write(content)
print('Done')