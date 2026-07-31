import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, T, RUBROS, hace, iniciales, plata } from '../lib/design'
import { moderatePublicContent } from '../lib/moderation'

const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const Back = () => <Icon><path d="m15 18-6-6 6-6" /></Icon>
const Share = () => <Icon><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></Icon>
const Message = () => <Icon><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></Icon>
const Edit = () => <Icon><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" /></Icon>
const Instagram = () => <Icon size={18}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none" /></Icon>
const Check = () => <Icon size={13}><path d="m5 12 4 4L19 6" /></Icon>
const Close = () => <Icon><path d="m18 6-12 12M6 6l12 12" /></Icon>
const Star = ({ filled = true, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#e5a117' : 'none'} stroke="#e5a117" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
  </svg>
)

const categoryInfo = service => {
  const key = service?.service_key || service?.category
  return RUBROS.find(item => item.key === key) || { key: key || 'otro', emoji: '🛠️', label: service?.category || 'Otro' }
}

export default function ServiceDetail({ postId, currentUser, onNavigate, onEdit }) {
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewDraft, setReviewDraft] = useState({ rating: 0, comment: '' })
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const nav = onNavigate || (() => {})
  const neighborhoodId = currentUser?.neighborhoodId

  useEffect(() => {
    let active = true
    setLoading(true)
    setService(null)
    setError('')
    if (!postId || !neighborhoodId) {
      setError('No pudimos confirmar este servicio dentro de tu barrio.')
      setLoading(false)
      return () => { active = false }
    }
    supabase
      .from('posts')
      .select(`
        *,
        author:profiles!author_id (
          id, full_name, avatar_url, reputation_score,
          badge_founder, badge_trusted_seller, verified, verification_status
        )
      `)
      .eq('id', postId)
      .eq('type', 'service')
      .eq('status', 'active')
      .eq('neighborhood_id', neighborhoodId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return
        if (loadError || !data) setError('No pudimos encontrar este servicio.')
        else setService(data)
        setLoading(false)
      })
    return () => { active = false }
  }, [postId, neighborhoodId])

  useEffect(() => {
    let active = true
    if (!postId || !neighborhoodId || !service?.id) return () => { active = false }
    supabase
      .from('service_reviews')
      .select(`
        id, service_id, provider_id, reviewer_id, rating, comment, created_at, updated_at,
        reviewer:profiles!reviewer_id (id, full_name, avatar_url, badge_founder, badge_trusted_seller)
      `)
      .eq('service_id', postId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error: reviewsError }) => {
        if (!active) return
        if (reviewsError) console.warn('Service reviews fetch error:', reviewsError.message)
        else setReviews(data || [])
      })
    return () => { active = false }
  }, [postId, neighborhoodId, service?.id])

  const share = async () => {
    const data = {
      title: service?.title || 'Servicio de el barrio',
      text: `${service?.title || 'Servicio disponible'} en el barrio`,
      url: window.location.href,
    }
    try {
      if (navigator.share) await navigator.share(data)
      else await navigator.clipboard.writeText(window.location.href)
    } catch {}
  }

  if (loading) return <div style={s.center}>Cargando servicio…</div>
  if (!service) return <div style={s.center}><strong>{error}</strong><button style={s.backText} onClick={() => nav('back')}>Volver a Servicios</button></div>

  const category = categoryInfo(service)
  const author = service.author || {}
  const verified = author.verified || author.verification_status === 'verified' || author.badge_trusted_seller
  const isOwn = Boolean(currentUser?.profileId && service.author_id === currentUser.profileId)
  const price = service.price != null && Number(service.price) > 0 ? `Desde ${plata(service.price)}` : 'Valor a convenir'
  const whatsapp = (service.service_whatsapp || '').replace(/\D/g, '')
  const instagram = (service.service_instagram || '').trim().replace(/^@/, '')

  const contact = () => {
    if (isOwn) return onEdit?.(service)
    nav('chatconversation', { postId: service.id, sellerId: service.author_id })
  }

  const ownReview = currentUser?.profileId
    ? reviews.find(review => review.reviewer_id === currentUser.profileId)
    : null
  const reviewCount = Number(service.rating_count) || reviews.length
  const reviewAverage = Number(service.rating) || (reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : 0)

  const openReview = () => {
    setReviewDraft({ rating: Number(ownReview?.rating) || 0, comment: ownReview?.comment || '' })
    setReviewError('')
    setReviewOpen(true)
  }

  const saveReview = async (event) => {
    event.preventDefault()
    const reviewerId = currentUser?.profileId
    const comment = reviewDraft.comment.trim()
    if (!reviewerId) {
      setReviewError('Necesitas iniciar sesión para dejar una opinión.')
      return
    }
    if (reviewDraft.rating < 1 || reviewDraft.rating > 5) {
      setReviewError('Selecciona una calificación de 1 a 5 estrellas.')
      return
    }
    if (comment && comment.length < 4) {
      setReviewError('El comentario debe tener al menos 4 caracteres o quedar vacío.')
      return
    }

    setReviewSaving(true)
    setReviewError('')
    try {
      await moderatePublicContent({ kind: 'service_review', text: comment })
    } catch (moderationError) {
      setReviewError(moderationError?.message || 'No pudimos revisar tu opinión.')
      setReviewSaving(false)
      return
    }
    const payload = {
      service_id: service.id,
      provider_id: service.author_id,
      reviewer_id: reviewerId,
      rating: reviewDraft.rating,
      comment: comment || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error: saveError } = await supabase
      .from('service_reviews')
      .upsert(payload, { onConflict: 'service_id,reviewer_id' })
      .select(`
        id, service_id, provider_id, reviewer_id, rating, comment, created_at, updated_at,
        reviewer:profiles!reviewer_id (id, full_name, avatar_url, badge_founder, badge_trusted_seller)
      `)
      .single()

    if (saveError) {
      setReviewError(`No pudimos guardar tu opinión: ${saveError.message}`)
      setReviewSaving(false)
      return
    }

    setReviews(current => [data, ...current.filter(review => review.id !== data.id && review.reviewer_id !== reviewerId)])
    const { data: summary } = await supabase
      .from('posts')
      .select('rating, rating_count')
      .eq('id', service.id)
      .maybeSingle()
    if (summary) setService(current => ({ ...current, ...summary }))
    setReviewSaving(false)
    setReviewOpen(false)
  }

  return (
    <div style={s.wrap}>
      <div style={s.scroll}>
        <header style={s.header}>
          <button style={s.circleBtn} onClick={() => nav('back')} aria-label="Volver"><Back /></button>
          <strong style={s.headerTitle}>Detalle del servicio</strong>
          <button style={s.circleBtn} onClick={share} aria-label="Compartir"><Share /></button>
        </header>

        <main style={s.main}>
          <section style={s.intro}>
            <span style={s.categoryBadgeInline}>{category.emoji} {category.label}</span>
            <div style={s.introTop}><span style={s.price}>{price}</span><span style={s.time}>{hace(service.created_at)}</span></div>
            <h1 style={s.title}>{service.title || 'Servicio disponible'}</h1>
            {service.is_featured && <span style={s.sponsored}>✦ Patrocinado</span>}
          </section>

          <button type="button" style={s.providerCard} onClick={() => nav('sellerprofile', { sellerId: service.author_id })}>
            {author.avatar_url ? <img src={author.avatar_url} alt="" style={s.avatar} /> : <span style={s.avatarFallback}>{iniciales(author.full_name)}</span>}
            <span style={s.providerCopy}><small style={s.providerLabel}>Ofrecido por</small><strong style={s.providerName}>{author.full_name || 'Vecino del barrio'}</strong><em style={s.providerState}>{verified ? <><Check /> Perfil verificado</> : 'Vecino del barrio'}</em></span>
            <span style={s.chevron}>›</span>
          </button>

          <section style={s.infoCard}>
            <h2 style={s.sectionTitle}>Acerca del servicio</h2>
            <p style={s.description}>{service.content || service.description || 'El prestador todavía no agregó una descripción.'}</p>
          </section>

          <section style={s.reviewsCard}>
            <div style={s.reviewsHeading}>
              <span><h2 style={s.sectionTitle}>Opiniones de vecinos</h2><small style={s.reviewsSubtitle}>Experiencias reales con este servicio</small></span>
              <span style={s.ratingSummary}>{reviewCount > 0 ? <><Star size={16} /><strong>{reviewAverage.toFixed(1)}</strong><small>({reviewCount})</small></> : <strong style={s.newLabel}>Nuevo</strong>}</span>
            </div>

            {!isOwn && <button type="button" style={s.reviewCta} onClick={openReview}><Star size={17} /><span>{ownReview ? 'Editar mi opinión' : 'Deja tu opinión'}</span></button>}

            {reviews.length > 0
              ? <div style={s.reviewList}>{reviews.map(review => {
                const reviewer = review.reviewer || {}
                return <article key={review.id} style={s.reviewItem}>
                  <div style={s.reviewTop}>
                    {reviewer.avatar_url ? <img src={reviewer.avatar_url} alt="" style={s.reviewAvatar} /> : <span style={s.reviewAvatarFallback}>{iniciales(reviewer.full_name)}</span>}
                    <span style={s.reviewAuthor}><strong>{reviewer.full_name || 'Vecino del barrio'}</strong><small>{hace(review.updated_at || review.created_at)}</small></span>
                    <span style={s.reviewStars}>{[1, 2, 3, 4, 5].map(value => <Star key={value} size={12} filled={value <= review.rating} />)}</span>
                  </div>
                  {review.comment && <p style={s.reviewComment}>{review.comment}</p>}
                </article>
              })}</div>
              : <p style={s.emptyReviews}>Aún no hay opiniones. Sé la primera persona en compartir tu experiencia.</p>}
          </section>

          <section style={s.trustCard}>
            <span style={s.trustIcon}>✓</span>
            <span style={s.trustCopy}><strong style={s.trustTitle}>Contacto dentro de el barrio</strong><small style={s.trustText}>Conversa primero por chat y coordina los detalles antes de contratar.</small></span>
          </section>
        </main>
      </div>

      <footer style={s.footer}>
        <div style={s.footerActions}>
          {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" style={s.footerSocial}><span>💬</span><strong>WhatsApp</strong></a>}
          {isOwn && !whatsapp && <button type="button" style={s.footerSocialEmpty} onClick={() => onEdit?.(service)}><span>💬</span><strong>Agregar WhatsApp</strong></button>}
          {instagram && <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" style={s.footerSocial}><Instagram /><strong>Instagram</strong></a>}
          {isOwn && !instagram && <button type="button" style={s.footerSocialEmpty} onClick={() => onEdit?.(service)}><Instagram /><strong>Agregar Instagram</strong></button>}
          <button type="button" style={s.contactBtn} onClick={contact}>{isOwn ? <Edit /> : <Message />}<span>{isOwn ? 'Editar' : 'Chat'}</span></button>
        </div>
      </footer>

      {reviewOpen && <div style={s.sheetOverlay} onClick={() => !reviewSaving && setReviewOpen(false)}>
        <form style={s.reviewSheet} onSubmit={saveReview} onClick={event => event.stopPropagation()}>
          <span style={s.sheetHandle} />
          <div style={s.sheetHeader}>
            <span><h2 style={s.sheetTitle}>{ownReview ? 'Edita tu opinión' : 'Deja tu opinión'}</h2><small style={s.sheetSubtitle}>{service.title}</small></span>
            <button type="button" style={s.closeBtn} onClick={() => setReviewOpen(false)} disabled={reviewSaving} aria-label="Cerrar"><Close /></button>
          </div>
          <div style={s.starPicker} aria-label="Calificación">
            {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" style={s.starButton} onClick={() => setReviewDraft(current => ({ ...current, rating: value }))} aria-label={`${value} estrellas`}><Star size={34} filled={value <= reviewDraft.rating} /></button>)}
          </div>
          <label style={s.reviewLabel}>Comentario opcional</label>
          <textarea style={s.reviewTextarea} maxLength={800} rows={4} placeholder="Cuéntale a tus vecinos cómo fue tu experiencia…" value={reviewDraft.comment} onChange={event => setReviewDraft(current => ({ ...current, comment: event.target.value }))} />
          <small style={s.counter}>{reviewDraft.comment.length}/800</small>
          {reviewError && <div style={s.reviewError}>{reviewError}</div>}
          <button type="submit" style={{ ...s.submitReview, opacity: reviewSaving ? .65 : 1 }} disabled={reviewSaving}>{reviewSaving ? 'Guardando…' : 'Publicar opinión'}</button>
        </form>
      </div>}
    </div>
  )
}

const s = {
  wrap: { width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: C.texto, background: C.fondo, fontFamily: T.font },
  scroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  header: { minHeight: 72, padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 16px 10px', position: 'sticky', top: 0, zIndex: 20, display: 'grid', gridTemplateColumns: '40px 1fr 40px', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.borde}`, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(12px)' },
  headerTitle: { fontSize: 15, fontWeight: 700, textAlign: 'center' },
  circleBtn: { width: 38, height: 38, padding: 0, display: 'grid', placeItems: 'center', border: `1px solid ${C.borde}`, borderRadius: '50%', color: C.texto, background: '#fff' },
  main: { padding: '14px 16px 108px' },
  heroCard: { overflow: 'hidden', border: `1px solid ${C.borde}`, borderRadius: 17, background: '#fff', boxShadow: '0 5px 18px rgba(31,55,39,.06)' },
  hero: { height: 184, position: 'relative', overflow: 'hidden', background: C.verdeBg },
  heroImage: { width: '100%', height: '100%', display: 'block', objectFit: 'cover' },
  heroFallback: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, color: C.verdeOsc, background: `linear-gradient(135deg, ${C.verdeBg}, #fff)` },
  heroEmoji: { fontSize: 44 },
  heroCaption: { fontSize: 10, fontWeight: 700 },
  categoryBadge: { position: 'absolute', left: 12, bottom: 12, padding: '6px 10px', borderRadius: 999, color: C.verdeOsc, background: 'rgba(255,255,255,.94)', boxShadow: '0 3px 10px rgba(0,0,0,.10)', fontSize: 11, fontWeight: 700 },
  categoryBadgeInline: { display: 'inline-flex', marginBottom: 10, padding: '5px 9px', borderRadius: 999, color: C.verdeOsc, background: C.verdeBg, fontSize: 10.5, fontWeight: 700 },
  thumbnails: { padding: 9, display: 'flex', gap: 7, overflowX: 'auto' },
  thumbnail: { width: 54, height: 42, flex: '0 0 auto', padding: 0, overflow: 'hidden', border: '2px solid transparent', borderRadius: 9, background: C.fondo },
  thumbnailImage: { width: '100%', height: '100%', display: 'block', objectFit: 'cover' },
  intro: { padding: '16px 2px 13px' },
  introTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  price: { color: C.verde, fontSize: 16, fontWeight: 800 },
  time: { color: C.textoTenue, fontSize: 10 },
  title: { margin: '6px 0 0', fontSize: 22, lineHeight: 1.25, letterSpacing: '-.35px' },
  sponsored: { marginTop: 8, display: 'inline-flex', padding: '4px 8px', borderRadius: 999, color: '#8a5b08', background: '#fef3c7', fontSize: 9, fontWeight: 800 },
  providerCard: { width: '100%', padding: 13, display: 'grid', gridTemplateColumns: '48px minmax(0,1fr) auto', alignItems: 'center', gap: 11, border: `1px solid ${C.borde}`, borderRadius: 15, color: C.texto, background: '#fff', textAlign: 'left', boxShadow: '0 3px 12px rgba(31,55,39,.04)' },
  avatar: { width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' },
  avatarFallback: { width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: '50%', color: C.verdeOsc, background: C.verdeSuave, fontSize: 14, fontWeight: 800 },
  providerCopy: { minWidth: 0, display: 'grid', gap: 3 },
  providerLabel: { color: C.textoTenue, fontSize: 9, fontStyle: 'normal' },
  providerName: { overflow: 'hidden', fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  providerState: { display: 'flex', alignItems: 'center', gap: 3, color: C.verdeOsc, fontSize: 9, fontStyle: 'normal' },
  chevron: { color: C.textoTenue, fontSize: 24 },
  infoCard: { marginTop: 12, padding: 16, border: `1px solid ${C.borde}`, borderRadius: 15, background: '#fff' },
  sectionTitle: { margin: '0 0 9px', fontSize: 15 },
  description: { margin: 0, color: C.textoSuave, fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' },
  reviewsCard: { marginTop: 12, padding: 16, border: `1px solid ${C.borde}`, borderRadius: 15, background: '#fff' },
  reviewsHeading: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  reviewsSubtitle: { display: 'block', marginTop: -5, color: C.textoTenue, fontSize: 9.5 },
  ratingSummary: { minHeight: 26, display: 'flex', alignItems: 'center', gap: 4, color: C.texto, fontSize: 12 },
  newLabel: { padding: '5px 9px', borderRadius: 999, color: C.verdeOsc, background: C.verdeBg, fontSize: 10 },
  reviewCta: { width: '100%', marginTop: 13, minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: `1px solid ${C.verde}`, borderRadius: 12, color: C.verdeOsc, background: C.verdeBg, fontSize: 12.5, fontWeight: 800 },
  reviewList: { marginTop: 14, display: 'grid', gap: 10 },
  reviewItem: { paddingTop: 11, borderTop: `1px solid ${C.borde}` },
  reviewTop: { display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) auto', alignItems: 'center', gap: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' },
  reviewAvatarFallback: { width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: '50%', color: '#fff', background: C.verde, fontSize: 9, fontWeight: 800 },
  reviewAuthor: { minWidth: 0, display: 'grid', gap: 1, fontSize: 11.5 },
  reviewStars: { display: 'flex', gap: 1 },
  reviewComment: { margin: '8px 0 0 40px', color: C.textoSuave, fontSize: 11.5, lineHeight: 1.5 },
  emptyReviews: { margin: '13px 0 0', padding: 12, borderRadius: 11, color: C.textoSuave, background: C.fondo, fontSize: 11, lineHeight: 1.5, textAlign: 'center' },
  trustCard: { marginTop: 12, padding: 14, display: 'flex', alignItems: 'flex-start', gap: 10, borderRadius: 14, color: C.verdeOsc, background: C.verdeBg },
  trustIcon: { width: 27, height: 27, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: '50%', color: '#fff', background: C.verde, fontWeight: 800 },
  trustCopy: { display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.45 },
  trustTitle: { fontSize: 13, fontWeight: 800 },
  trustText: { color: C.textoSuave, fontSize: 11.5 },
  footer: { padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)', borderTop: `1px solid ${C.borde}`, background: 'rgba(255,255,255,.96)', boxShadow: '0 -6px 20px rgba(31,55,39,.06)' },
  footerActions: { display: 'flex', gap: 8 },
  footerSocial: { minHeight: 48, flex: 1, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: `1px solid ${C.borde}`, borderRadius: 13, color: C.texto, background: '#fff', textDecoration: 'none', fontSize: 10.5 },
  footerSocialEmpty: { minHeight: 48, flex: 1, padding: '0 7px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, border: `1px dashed ${C.verde}`, borderRadius: 13, color: C.verdeOsc, background: C.verdeBg, fontSize: 9.5 },
  contactBtn: { minHeight: 48, flex: 1, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 0, borderRadius: 13, color: '#fff', background: C.verde, fontSize: 12, fontWeight: 800, boxShadow: '0 7px 18px rgba(22,163,74,.22)' },
  sheetOverlay: { position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', background: 'rgba(15,23,18,.46)', backdropFilter: 'blur(2px)' },
  reviewSheet: { width: '100%', maxHeight: 'calc(100% - 44px)', padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 18px)', overflowY: 'auto', borderRadius: '22px 22px 0 0', background: '#fff', boxShadow: '0 -12px 35px rgba(0,0,0,.18)' },
  sheetHandle: { width: 38, height: 4, margin: '0 auto 14px', display: 'block', borderRadius: 999, background: '#d6ded8' },
  sheetHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sheetTitle: { margin: 0, fontSize: 18 },
  sheetSubtitle: { display: 'block', marginTop: 3, color: C.textoSuave, fontSize: 10.5 },
  closeBtn: { width: 36, height: 36, flex: '0 0 auto', padding: 0, display: 'grid', placeItems: 'center', border: 0, borderRadius: '50%', color: C.texto, background: C.fondo },
  starPicker: { margin: '22px 0 18px', display: 'flex', justifyContent: 'center', gap: 6 },
  starButton: { padding: 2, border: 0, background: 'transparent' },
  reviewLabel: { display: 'block', marginBottom: 7, fontSize: 11.5, fontWeight: 700 },
  reviewTextarea: { width: '100%', minHeight: 104, padding: 12, resize: 'vertical', boxSizing: 'border-box', border: `1px solid ${C.borde}`, borderRadius: 12, color: C.texto, background: C.fondo, fontFamily: T.font, fontSize: 13, lineHeight: 1.5, outline: 'none' },
  counter: { display: 'block', marginTop: 4, color: C.textoTenue, fontSize: 9.5, textAlign: 'right' },
  reviewError: { marginTop: 10, padding: 10, borderRadius: 10, color: '#991b1b', background: '#fee2e2', fontSize: 10.5, lineHeight: 1.4 },
  submitReview: { width: '100%', minHeight: 46, marginTop: 13, border: 0, borderRadius: 12, color: '#fff', background: C.verde, fontSize: 13.5, fontWeight: 800 },
  center: { width: '100%', height: '100%', padding: 30, display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 14, color: C.texto, background: C.fondo, fontFamily: T.font, textAlign: 'center' },
  backText: { padding: '9px 14px', border: 0, borderRadius: 10, color: '#fff', background: C.verde, fontWeight: 700 },
}
