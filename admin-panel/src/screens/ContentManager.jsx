import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const ASSET = 'https://elbarrio.lat/el-barrio/community-assets/about-hero.jpg'
const ABOUT_DEFAULTS = {
  heroEyebrow: 'Nuestra historia', heroTitle: 'Conectando corazones, fortaleciendo barrios.', heroImage: ASSET,
  missionTitle: 'Nuestra misión', missionBody: 'Transformar vecindarios en comunidades vivas, seguras y prósperas, utilizando la tecnología como puente para el encuentro humano y el apoyo mutuo.',
  economyTitle: 'Economía local', economyBody: 'Impulsamos el comercio de proximidad para que cada vecino descubra y apoye el talento que vive a pocos pasos de su hogar.',
  valuesTitle: 'Valores que nos mueven', valuesSubtitle: 'La base de nuestra convivencia digital',
  values: ['Confianza', 'Pertenencia', 'Transparencia', 'Solidaridad'], facesTitle: 'El rostro de El Barrio',
  faces: ['Vecinos fundadores', 'Comercio local', 'Equipo El Barrio', 'Comunidad viva'].map((label, index) => ({ label, image: ASSET, position: ['20% 80%', '72% 68%', '45% 76%', '88% 74%'][index] })),
  ctaTitle: 'Tu barrio comienza contigo', ctaBody: 'Conoce lo que ocurre cerca, apoya al comercio local y conecta con tus vecinos.', ctaButton: 'Explorar mi barrio',
}
const PRIVACY_DEFAULTS = {
  intro: 'Ajusta la experiencia y revisa la información importante de tu cuenta.',
  termsTitle: 'Términos y condiciones', prohibitedTitle: 'Productos prohibidos', contactTitle: 'Contáctanos',
}

const mergeAbout = content => ({
  ...ABOUT_DEFAULTS, ...content,
  values: Array.isArray(content?.values) && content.values.length === 4 ? content.values : ABOUT_DEFAULTS.values,
  faces: Array.isArray(content?.faces) && content.faces.length === 4
    ? content.faces.map((face, index) => ({ ...ABOUT_DEFAULTS.faces[index], ...face }))
    : ABOUT_DEFAULTS.faces,
})

export default function ContentManager({ profile }) {
  const [tab, setTab] = useState('privacy_security')
  const [privacy, setPrivacy] = useState(PRIVACY_DEFAULTS)
  const [about, setAbout] = useState(ABOUT_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    supabase.from('app_content_pages').select('slug, content').in('slug', ['privacy_security', 'about']).then(({ data, error: loadError }) => {
      if (!active) return
      setLoading(false)
      if (loadError) return setError(`No fue posible cargar el contenido: ${loadError.message}`)
      const pages = new Map((data || []).map(item => [item.slug, item.content || {}]))
      setPrivacy({ ...PRIVACY_DEFAULTS, ...(pages.get('privacy_security') || {}) })
      setAbout(mergeAbout(pages.get('about') || {}))
    })
    return () => { active = false }
  }, [])

  const save = async event => {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    const content = tab === 'about' ? about : privacy
    const { error: saveError } = await supabase.rpc('admin_update_app_content', { p_slug: tab, p_content: content })
    setSaving(false)
    if (saveError) return setError(`No fue posible guardar: ${saveError.message}`)
    setNotice('Contenido actualizado. La app mostrará los cambios al volver a abrir la sección.')
  }

  const upload = async (file, key, faceIndex = null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Selecciona una imagen válida.')
    if (file.size > 5 * 1024 * 1024) return setError('La imagen debe pesar menos de 5 MB.')
    setUploading(key); setError('')
    try {
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `app-content/about-${key}-${profile?.id || 'admin'}-${Date.now()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('posts').upload(path, file, { cacheControl: '3600' })
      if (uploadError) throw uploadError
      const url = supabase.storage.from('posts').getPublicUrl(path).data?.publicUrl
      if (!url) throw new Error('No pudimos obtener la URL de la imagen.')
      if (faceIndex == null) setAbout(current => ({ ...current, heroImage: url }))
      else setAbout(current => ({ ...current, faces: current.faces.map((face, index) => index === faceIndex ? { ...face, image: url } : face) }))
    } catch (uploadError) {
      setError(uploadError.message || 'No fue posible subir la imagen.')
    } finally { setUploading('') }
  }

  const setPrivacyField = (field, value) => setPrivacy(current => ({ ...current, [field]: value }))
  const setAboutField = (field, value) => setAbout(current => ({ ...current, [field]: value }))
  const setValue = (index, value) => setAbout(current => ({ ...current, values: current.values.map((item, itemIndex) => itemIndex === index ? value : item) }))
  const setFace = (index, field, value) => setAbout(current => ({ ...current, faces: current.faces.map((face, faceIndex) => faceIndex === index ? { ...face, [field]: value } : face) }))

  if (!profile?.is_superadmin) return <div className="admin-message error">Este contenido solo puede ser editado por un superadministrador.</div>

  return <section className="content-manager">
    <header className="page-heading"><div><p className="eyebrow">Identidad y textos</p><h1>Contenido de la app</h1><p>Edita textos e imágenes sin modificar el layout aprobado.</p></div></header>
    <div className="content-tabs"><button type="button" className={tab === 'privacy_security' ? 'is-active' : ''} onClick={() => { setTab('privacy_security'); setNotice('') }}>Privacidad y seguridad</button><button type="button" className={tab === 'about' ? 'is-active' : ''} onClick={() => { setTab('about'); setNotice('') }}>Nosotros</button></div>
    {error && <div className="admin-message error">{error}</div>}{notice && <div className="admin-message success">{notice}</div>}
    {loading ? <p className="content-loading">Cargando contenido…</p> : <form className="content-editor" onSubmit={save}>
      {tab === 'privacy_security' ? <>
        <section className="editor-section"><div className="editor-section-title"><span>1</span><div><h2>Introducción</h2><p>Texto superior de Privacidad y seguridad.</p></div></div><label className="field field-full">Texto introductorio<textarea rows="3" value={privacy.intro} onChange={event => setPrivacyField('intro', event.target.value)} /></label></section>
        <section className="editor-section"><div className="editor-section-title"><span>2</span><div><h2>Opciones</h2><p>Nombres visibles dentro de la sección.</p></div></div><div className="admin-form-grid"><label className="field">Términos<input value={privacy.termsTitle} onChange={event => setPrivacyField('termsTitle', event.target.value)} /></label><label className="field">Productos prohibidos<input value={privacy.prohibitedTitle} onChange={event => setPrivacyField('prohibitedTitle', event.target.value)} /></label><label className="field">Contacto<input value={privacy.contactTitle} onChange={event => setPrivacyField('contactTitle', event.target.value)} /></label></div></section>
      </> : <>
        <section className="editor-section"><div className="editor-section-title"><span>1</span><div><h2>Portada</h2><p>Imagen y mensaje principal de Nosotros.</p></div></div><div className="content-image-editor"><img src={about.heroImage} alt="Portada actual" /><label>{uploading === 'hero' ? 'Subiendo…' : 'Cambiar portada'}<input type="file" accept="image/*" disabled={!!uploading} onChange={event => upload(event.target.files?.[0], 'hero')} /></label></div><div className="admin-form-grid"><label className="field">Etiqueta<input value={about.heroEyebrow} onChange={event => setAboutField('heroEyebrow', event.target.value)} /></label><label className="field">Título<input value={about.heroTitle} onChange={event => setAboutField('heroTitle', event.target.value)} /></label></div></section>
        <section className="editor-section"><div className="editor-section-title"><span>2</span><div><h2>Propósito</h2><p>Tarjetas de misión y economía local.</p></div></div><div className="admin-form-grid"><label className="field">Título misión<input value={about.missionTitle} onChange={event => setAboutField('missionTitle', event.target.value)} /></label><label className="field field-full">Texto misión<textarea rows="4" value={about.missionBody} onChange={event => setAboutField('missionBody', event.target.value)} /></label><label className="field">Título economía local<input value={about.economyTitle} onChange={event => setAboutField('economyTitle', event.target.value)} /></label><label className="field field-full">Texto economía local<textarea rows="4" value={about.economyBody} onChange={event => setAboutField('economyBody', event.target.value)} /></label></div></section>
        <section className="editor-section"><div className="editor-section-title"><span>3</span><div><h2>Valores e imágenes</h2><p>Actualiza las cuatro etiquetas y sus imágenes.</p></div></div><div className="admin-form-grid"><label className="field">Título de valores<input value={about.valuesTitle} onChange={event => setAboutField('valuesTitle', event.target.value)} /></label><label className="field">Subtítulo<input value={about.valuesSubtitle} onChange={event => setAboutField('valuesSubtitle', event.target.value)} /></label>{about.values.map((value, index) => <label className="field" key={`value-${index}`}>Valor {index + 1}<input value={value} onChange={event => setValue(index, event.target.value)} /></label>)}</div><label className="field content-faces-title">Título del bloque<input value={about.facesTitle} onChange={event => setAboutField('facesTitle', event.target.value)} /></label><div className="content-face-grid">{about.faces.map((face, index) => <article key={`face-${index}`}><img src={face.image} alt="" /><label>{uploading === `face-${index}` ? 'Subiendo…' : 'Cambiar imagen'}<input type="file" accept="image/*" disabled={!!uploading} onChange={event => upload(event.target.files?.[0], `face-${index}`, index)} /></label><input value={face.label} aria-label={`Etiqueta ${index + 1}`} onChange={event => setFace(index, 'label', event.target.value)} /></article>)}</div></section>
        <section className="editor-section"><div className="editor-section-title"><span>4</span><div><h2>Llamado final</h2><p>Texto de cierre de la página.</p></div></div><div className="admin-form-grid"><label className="field">Título<input value={about.ctaTitle} onChange={event => setAboutField('ctaTitle', event.target.value)} /></label><label className="field">Botón<input value={about.ctaButton} onChange={event => setAboutField('ctaButton', event.target.value)} /></label><label className="field field-full">Texto<textarea rows="3" value={about.ctaBody} onChange={event => setAboutField('ctaBody', event.target.value)} /></label></div></section>
      </>}
      <footer className="content-editor-footer"><span>El layout, los colores y los íconos permanecen protegidos.</span><button className="button button-primary" type="submit" disabled={saving || !!uploading}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></footer>
    </form>}
  </section>
}
