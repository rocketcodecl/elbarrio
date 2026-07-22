import { useState } from 'react'
import { C, T } from '../lib/design'

const ASSET = '/community-assets/'

const Icon = ({ name, size = 22, color = C.verde }) => {
  const paths = {
    back: <><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    store: <><path d="M3 9l2-6h14l2 6"/><path d="M5 13v8h14v-8M9 21v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>,
    alert: <><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1"/><path d="M12 16v2"/></>,
    rules: <><path d="m14 4 6 6"/><path d="m13 5-8.5 8.5a2.1 2.1 0 0 0 3 3L16 8"/><path d="M16 2 22 8M3 21h10"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Screen({ title, onNavigate, children }) {
  return <div className="community-v2" style={s.screen}>
    <header style={s.header}>
      <button style={s.headerBtn} onClick={() => onNavigate?.('back')} aria-label="Volver"><Icon name="back" size={21} color={C.texto}/></button>
      <h1 style={s.headerTitle}>{title}</h1><div style={s.headerBalance}/>
    </header>
    <div style={s.scroll}>{children}</div>
  </div>
}

const SectionTitle = ({ children, sub, centered = false }) => <div style={{...s.sectionHeading,textAlign:centered?'center':'left'}}><h2>{children}</h2>{sub&&<p>{sub}</p>}</div>

export function AboutUs({ onNavigate }) {
  return <Screen title="Nosotros" onNavigate={onNavigate}>
    <section style={{...s.hero,backgroundImage:`linear-gradient(180deg,transparent 30%,rgba(5,20,12,.82)),url(${ASSET}about-hero.jpg)`}}><span>Nuestra historia</span><h2>Conectando corazones,<br/>fortaleciendo barrios.</h2></section>
    <article style={s.featureCard}><div style={s.lineIcon}><Icon name="heart"/></div><h2>Nuestra misión</h2><p>Transformar vecindarios en comunidades vivas, seguras y prósperas, utilizando la tecnología como puente para el encuentro humano y el apoyo mutuo.</p></article>
    <article style={{...s.featureCard,background:C.verdeBg}}><div style={s.lineIcon}><Icon name="store"/></div><h2>Economía local</h2><p>Impulsamos el comercio de proximidad para que cada vecino descubra y apoye el talento que vive a pocos pasos de su hogar.</p></article>
    <SectionTitle centered sub="La base de nuestra convivencia digital">Valores que nos mueven</SectionTitle>
    <div style={s.values}>{[['shield','Confianza'],['users','Pertenencia'],['file','Transparencia'],['heart','Solidaridad']].map(([icon,label])=><div key={label} style={s.valuePill}><Icon name={icon} size={19}/><span>{label}</span></div>)}</div>
    <SectionTitle>El rostro de El Barrio</SectionTitle>
    <div style={s.faces}>{['Vecinos fundadores','Comercio local','Equipo El Barrio','Comunidad viva'].map((label,i)=><div key={label} style={{...s.face,backgroundImage:`linear-gradient(transparent 50%,rgba(0,0,0,.72)),url(${ASSET}about-hero.jpg)`,backgroundPosition:["20% 80%","72% 68%","45% 76%","88% 74%"][i]}}><span>{label}</span></div>)}</div>
    <section className="cta" style={s.cta}>
      <div style={s.ctaIcon}><Icon name="users" size={25} color="#fff"/></div>
      <h2 style={s.ctaTitle}>Tu barrio comienza contigo</h2>
      <p style={s.ctaText}>Conoce lo que ocurre cerca, apoya al comercio local y conecta con tus vecinos.</p>
      <button style={s.ctaButton} onClick={()=>onNavigate?.('inicio')}>Explorar mi barrio <Icon name="arrow" size={18} color={C.verdeOsc}/></button>
    </section>
  </Screen>
}

export function Terms({ onNavigate }) {
  return <Screen title="Términos y condiciones" onNavigate={onNavigate}>
    <div style={s.docIntro}><span style={s.docBadge}>Documento oficial</span><h2 style={s.docTitle}>Términos y condiciones</h2><p>Última actualización: 22 de julio de 2026</p></div>
    <article className="legalDocument" style={s.legalDocument}>
      <LegalSection icon="file" number="1" title="Aceptación de los términos">
        Al acceder y utilizar la aplicación <strong>El Barrio</strong>, aceptas cumplir y estar sujeto a estos términos y condiciones. El Barrio es una plataforma comunitaria diseñada para fomentar la conectividad local y la seguridad entre vecinos. Si no estás de acuerdo, por favor no utilices nuestros servicios.
      </LegalSection>
      <LegalSection icon="users" number="2" title="Registro de usuario y veracidad">
        Para participar plenamente, debes registrarte proporcionando información veraz y actual. El Barrio se reserva el derecho de validar la residencia del usuario para mantener la integridad de la red hiperlocal.
      </LegalSection>
      <LegalSection icon="lock" number="3" title="Seguridad de la cuenta">
        Cada perfil es personal e intransferible. Eres responsable de proteger tus credenciales de acceso y de toda actividad realizada desde tu cuenta.
      </LegalSection>
      <LegalSection icon="rules" number="4" title="Normas de convivencia">
        Como plataforma comunitaria, promovemos el respeto y la confianza. Queda estrictamente prohibido:
        <ul><li>Publicar contenido ofensivo, discriminatorio o violento.</li><li>Utilizar el mercado para vender artículos ilegales.</li><li>Acosar o intimidar a otros residentes.</li><li>Difundir noticias falsas que puedan causar pánico.</li></ul>
      </LegalSection>
      <LegalSection icon="store" number="5" title="Mercado local y servicios">
        El Barrio facilita el contacto entre vecinos. No se hace responsable de la calidad de los productos vendidos ni de la ejecución de servicios particulares contratados mediante la plataforma.
      </LegalSection>
      <LegalSection icon="shield" number="6" title="Privacidad y datos">
        Tus datos están protegidos bajo nuestra Política de Privacidad. La geolocalización se utiliza para mostrar contenido relevante para tu sector y nunca se comparte con terceros sin consentimiento explícito.
      </LegalSection>
      <div style={s.legalFooter}>
        <h3 style={s.legalFooterTitle}>¿Tienes dudas?</h3>
        <p style={s.legalFooterText}>Contacta a nuestro soporte comunitario.</p>
        <button style={s.legalFooterButton} onClick={()=>onNavigate?.('contact')}>Contactar soporte</button>
      </div>
    </article>
  </Screen>
}

function LegalSection({ icon, number, title, children }) {
  return <section style={s.legalSection}><div style={s.legalTitle}><Icon name={icon} size={20}/><h3>{number}. {title}</h3></div><div style={s.legalText}>{children}</div></section>
}

export function ProhibitedProducts({ onNavigate }) {
  const items=[['alert','Sustancias e insumos médicos','Medicamentos con receta, drogas o parafernalia.'],['shield','Armamento','Armas, explosivos, réplicas o elementos peligrosos.'],['alert','Alcohol y tabaco','Bebidas alcohólicas, tabaco y vapeadores.'],['shield','Servicios no autorizados','Apuestas, préstamos informales o actividades ilegales.'],['store','Falsificaciones','Réplicas o imitaciones de marcas registradas.'],['file','Datos personales','Documentos, cuentas, bases de datos o identidades digitales.']]
  return <Screen title="Productos prohibidos" onNavigate={onNavigate}>
    <div style={s.centerIntro}><div style={s.warningIcon}><Icon name="shield" size={28} color={C.rojo}/></div><h2>Seguridad en el Mercado</h2><p>Estos productos y servicios están estrictamente prohibidos para proteger a todos los vecinos.</p></div>
    <div className="prohibited" style={s.prohibited}>{items.map(([icon,title,text],index)=><article key={title} style={{gridColumn:index===0||index===3?'1 / -1':undefined,minHeight:index===0||index===3?128:158}}><Icon name={icon} size={24} color={C.rojo}/><h3>{title}</h3><p>{text}</p></article>)}</div>
    <section className="consequences" style={s.consequences}><h2>Consecuencias de incumplimiento</h2>{['Eliminación inmediata de la publicación','Suspensión de la cuenta','Reporte a las autoridades en casos graves'].map(x=><p key={x}><span>✓</span>{x}</p>)}</section>
    <button style={s.reportBtn} onClick={()=>onNavigate?.('contact')}><Icon name="alert" size={19} color={C.rojo}/> Reportar una publicación</button>
  </Screen>
}

export function InviteNeighbors({ onNavigate }) {
  const [copied,setCopied]=useState(false); const url=`${window.location.origin}?invite=elbarrio-las-condes`
  const copy=async()=>{await navigator.clipboard?.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)}
  const share=async()=>navigator.share?navigator.share({title:'El Barrio',text:'Únete a nuestro barrio',url}):copy()
  return <Screen title="Invitar vecinos" onNavigate={onNavigate}>
    <section style={{...s.inviteHero,backgroundImage:`linear-gradient(transparent 45%,rgba(0,0,0,.68)),url(${ASSET}invite-hero.jpg)`}}><h2>Construye comunidad,<br/>un vecino a la vez.</h2></section>
    <div style={s.centerIntro}><h2>Invita a tu barrio</h2><p>Comparte el acceso a nuestra red vecinal de Las Condes.</p></div>
    <section className="inviteLink" style={s.inviteLink}><div style={s.lineIcon}><Icon name="link"/></div><div><strong>Enlace de invitación</strong><span>elbarrio.app/invitar</span></div><button onClick={copy}>{copied?'Copiado':'Copiar'}</button></section>
    <div className="shareGrid" style={s.shareGrid}><button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(`Únete a El Barrio ${url}`)}`)}>WhatsApp</button><button onClick={share}>Compartir</button></div>
    <section className="progress" style={s.progress}><strong>420 vecinos conectados</strong><div><span/></div><p>Estamos a 80 vecinos de nuestra próxima meta.</p></section>
    <aside style={s.infoBox}><Icon name="users"/><p><strong>Vecino solidario</strong><br/>Invita a cinco vecinos y obtén una insignia especial en tu perfil.</p></aside>
  </Screen>
}

export function ContactUs({ onNavigate }) {
  const [sent,setSent]=useState(false)
  return <Screen title="Contáctanos" onNavigate={onNavigate}>
    <div style={s.centerIntro}><div style={s.lineIconLarge}><Icon name="mail" size={28}/></div><h2>¿Cómo podemos ayudarte?</h2><p>Cuéntanos tu consulta, sugerencia o problema. Estamos para escucharte.</p></div>
    <form style={s.form} onSubmit={e=>{e.preventDefault();setSent(true)}}>
      <label>Nombre<input required placeholder="Tu nombre"/></label>
      <label>Correo electrónico<input required type="email" placeholder="correo@ejemplo.com"/></label>
      <label>Motivo<select><option>Consulta general</option><option>Problema técnico</option><option>Seguridad</option><option>Comercios</option></select></label>
      <label>Mensaje<textarea required placeholder="Escribe tu mensaje…"/></label>
      <button>Enviar mensaje <Icon name="arrow" size={18} color="#fff"/></button>
      {sent&&<p style={s.success}>Mensaje preparado. Conectaremos el envío al definir el canal oficial de soporte.</p>}
    </form>
    <section className="support" style={s.support}><div><h2>¿Prefieres chatear?</h2><p>Atención de lunes a viernes, 9:00–18:00.</p></div><button onClick={()=>onNavigate?.('chat')}>Abrir chat</button></section>
    <section className="socials" style={s.socials}><h2>Síguenos en redes</h2><div><span><Icon name="link" size={18}/> Instagram</span><span><Icon name="link" size={18}/> Facebook</span><span><Icon name="link" size={18}/> Twitter (X)</span><span><Icon name="link" size={18}/> TikTok</span></div></section>
    <aside style={s.emergency}><Icon name="alert" color={C.rojo}/><p><strong>¿Es una emergencia?</strong><br/>Llama al 133 o a Seguridad de Las Condes.</p></aside>
  </Screen>
}

export function SettingsHub({ onNavigate }) {
  const links=[['about','heart','Nosotros'],['invite','users','Invitar vecinos',true],['terms','file','Términos y condiciones'],['prohibited','shield','Productos prohibidos'],['contact','mail','Contáctanos']]
  return <Screen title="Información y ayuda" onNavigate={onNavigate}><p style={s.settingsIntro}>Conoce el proyecto y encuentra ayuda cuando la necesites.</p><div className="settings" style={s.settings}>{links.map(([route,icon,label,pending])=><button key={route} disabled={pending} style={{opacity:pending ? 0.58 : 1}} onClick={()=>onNavigate?.(route)}><Icon name={icon}/><span>{label}{pending&&<small>Próximamente</small>}</span>{!pending&&<Icon name="arrow" size={18} color={C.textoTenue}/>}</button>)}</div></Screen>
}

const s={
  screen:{width:'100%',height:'100%',background:C.fondo,fontFamily:T.font,display:'flex',flexDirection:'column',overflow:'hidden'},header:{height:65,background:C.card,borderBottom:`1px solid ${C.borde}`,display:'flex',alignItems:'center',gap:8,padding:'12px',flexShrink:0},headerBtn:{width:40,height:40,borderRadius:12,background:C.fondo,border:`1px solid ${C.borde}`,display:'grid',placeItems:'center'},headerTitle:{flex:1,textAlign:'center',fontSize:17,fontWeight:700,color:C.texto,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},headerBalance:{width:40},scroll:{flex:1,minHeight:0,overflowY:'auto',padding:'20px 16px 100px',WebkitOverflowScrolling:'touch'},
  hero:{height:290,borderRadius:16,backgroundSize:'cover',backgroundPosition:'center',padding:20,display:'flex',flexDirection:'column',justifyContent:'flex-end',color:'#fff',marginBottom:16},featureCard:{background:C.card,border:`1px solid ${C.borde}`,borderRadius:16,padding:18,marginBottom:12},lineIcon:{width:42,height:42,display:'grid',placeItems:'center',marginBottom:12},lineIconLarge:{width:56,height:56,display:'grid',placeItems:'center',margin:'0 auto 12px'},sectionHeading:{margin:'28px 0 12px'},values:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10},valuePill:{minHeight:46,display:'flex',alignItems:'center',gap:8,padding:'0 13px',border:`1px solid ${C.borde}`,borderRadius:999,background:C.card,color:C.texto,fontSize:12.5,fontWeight:600},faces:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10},face:{height:130,borderRadius:14,backgroundSize:'cover',display:'flex',alignItems:'flex-end',padding:12,color:'#fff',fontSize:11,fontWeight:700},cta:{position:'relative',overflow:'hidden',marginTop:24,padding:'26px 24px',borderRadius:18,background:`linear-gradient(135deg, ${C.verdeOsc} 0%, ${C.verde} 100%)`,textAlign:'left',boxShadow:'0 8px 22px rgba(15,95,54,.20)'},ctaIcon:{width:46,height:46,borderRadius:14,display:'grid',placeItems:'center',background:'rgba(255,255,255,.14)',marginBottom:18},ctaTitle:{fontSize:21,lineHeight:1.25,color:'#fff',margin:'0 0 8px'},ctaText:{maxWidth:290,fontSize:13,lineHeight:1.5,color:'rgba(255,255,255,.82)',margin:0},ctaButton:{minHeight:46,marginTop:20,padding:'0 18px',borderRadius:999,background:'#fff',color:C.verdeOsc,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8},
  docIntro:{marginBottom:20},docBadge:{display:'inline-block',padding:'5px 9px',borderRadius:999,background:C.verde,color:'#fff',fontSize:9,fontWeight:700},docTitle:{fontSize:27,lineHeight:1.15,color:C.texto,margin:'9px 0 3px'},legalDocument:{background:C.card,border:`1px solid ${C.borde}`,borderRadius:16,padding:'22px 18px'},legalSection:{marginBottom:22},legalTitle:{display:'flex',alignItems:'flex-start',gap:9,color:C.verdeOsc,marginBottom:7},legalText:{fontSize:12.5,lineHeight:1.58,color:C.textoSuave},legalNote:{width:'calc(100% - 10px)',display:'grid',gridTemplateColumns:'34px 1fr',gap:11,alignItems:'start',margin:'15px 0 2px 10px',padding:'13px 14px',border:`1px solid ${C.borde}`,borderRadius:11,background:'#fafcf9',color:C.texto,lineHeight:1.45},legalNoteIcon:{width:34,height:34,borderRadius:9,display:'grid',placeItems:'center',background:C.verdeBg,color:C.verdeOsc},legalNoteTitle:{display:'block',fontSize:11.5,fontWeight:700,color:C.verdeOsc,marginBottom:3},legalNoteText:{display:'block',fontSize:11.5,color:C.textoSuave},legalFooter:{borderTop:`1px solid ${C.borde}`,paddingTop:20,textAlign:'center'},legalFooterTitle:{fontSize:15,color:C.texto,margin:'0 0 4px'},legalFooterText:{fontSize:12,color:C.textoSuave,margin:0},legalFooterButton:{marginTop:16,padding:'12px 22px',borderRadius:999,background:C.verdeOsc,color:'#fff',fontWeight:700},
  centerIntro:{textAlign:'center',margin:'8px auto 24px',maxWidth:330},warningIcon:{width:58,height:58,display:'grid',placeItems:'center',margin:'0 auto 12px'},prohibited:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10},consequences:{marginTop:18,padding:18,borderRadius:16,background:C.card,border:`1px solid ${C.borde}`},reportBtn:{width:'100%',marginTop:14,padding:14,borderRadius:12,border:`1px solid ${C.rojoSuave}`,color:C.rojo,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontWeight:700},
  inviteHero:{height:330,borderRadius:18,backgroundSize:'cover',backgroundPosition:'center',padding:22,display:'flex',alignItems:'flex-end',color:'#fff'},inviteLink:{display:'grid',gridTemplateColumns:'44px 1fr auto',alignItems:'center',gap:12,padding:16,borderRadius:16,background:C.card,border:`1px solid ${C.borde}`},shareGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10},progress:{marginTop:20,padding:18,borderRadius:16,background:C.verdeBg},support:{marginTop:16,padding:18,borderRadius:16,background:C.verde,color:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12},emergency:{display:'flex',gap:12,marginTop:16,padding:16,borderRadius:14,background:C.rojoBg,border:`1px solid ${C.rojoSuave}`},
  form:{background:C.card,border:`1px solid ${C.borde}`,borderRadius:18,padding:18,display:'flex',flexDirection:'column',gap:16},success:{padding:12,borderRadius:10,background:C.verdeBg,color:C.verdeOsc},socials:{marginTop:16,padding:18,borderRadius:16,background:C.card,border:`1px solid ${C.borde}`},settingsIntro:{margin:'0 0 16px'},settings:{background:C.card,border:`1px solid ${C.borde}`,borderRadius:16,overflow:'hidden'},
}

if(typeof document!=='undefined'&&!document.getElementById('community-v2-css')){const el=document.createElement('style');el.id='community-v2-css';el.textContent=`
.community-v2 h2{font-size:18px;line-height:1.3;margin:0 0 7px}.community-v2 h3{font-size:14px;line-height:1.35;margin:0 0 5px}.community-v2 p{font-size:13px;line-height:1.55;color:${C.textoSuave};margin:0}
.community-v2 button{font-family:${T.font}}.community-v2 article p{font-size:12.5px}.community-v2 form label{display:flex;flex-direction:column;gap:7px;font-size:12.5px;font-weight:600;color:${C.texto}}
.community-v2 form input,.community-v2 form select,.community-v2 form textarea{width:100%;padding:13px 14px;border:1px solid ${C.borde};border-radius:11px;background:${C.fondo};font:inherit;color:${C.texto};outline:none}.community-v2 form textarea{height:110px;resize:none}.community-v2 form input:focus,.community-v2 form select:focus,.community-v2 form textarea:focus{border-color:${C.verde}}
.community-v2 form>button,.community-v2 .cta button{min-height:46px;border-radius:12px;background:${C.verde};color:white;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 18px}.community-v2 .cta button{margin:16px auto 0;background:${C.verdeOsc}}
.community-v2 .cta h2{color:${C.texto};font-size:21px;margin-bottom:8px}.community-v2 .cta p{color:#14532d;max-width:280px;margin:0 auto}.community-v2 .cta button{min-width:178px;border-radius:999px;background:#073d25;margin-top:18px}.community-v2 .values>div{min-height:48px;display:flex;align-items:center;justify-content:flex-start;gap:9px;padding:0 14px;border:1px solid #c8d5c9;border-radius:999px;background:${C.card};font-size:12.5px;color:${C.texto}}.community-v2 .docIntro>span{display:inline-block;padding:5px 9px;border-radius:999px;background:${C.verde};color:#fff;font-size:9px;font-weight:700}.community-v2 .docIntro h2{font-size:27px;margin:9px 0 2px}.community-v2 .legalDocument ul{margin:10px 0 0;padding-left:20px}.community-v2 .legalDocument li{margin-bottom:7px}.community-v2 .legalFooter h3{font-size:15px;margin-bottom:4px;color:${C.texto}}.community-v2 .legalFooter p{font-size:12px}.community-v2 .legalFooter button{margin-top:16px;padding:12px 22px;border-radius:999px;background:${C.verdeOsc};color:#fff;font-weight:700}.community-v2 .settings small{display:block;color:${C.textoTenue};font-size:9px;margin-top:2px}
.community-v2 .prohibited article{min-height:158px;padding:16px;border-radius:15px;background:${C.card};border:1px solid ${C.borde}}.community-v2 .prohibited article svg{margin-bottom:13px}.community-v2 .consequences p{display:flex;gap:9px;margin-top:10px}.community-v2 .consequences p span{color:${C.verde};font-weight:800}
.community-v2 .inviteLink strong,.community-v2 .inviteLink span{display:block}.community-v2 .inviteLink span{font-size:11px;color:${C.textoTenue};margin-top:2px}.community-v2 .inviteLink button{padding:9px 13px;border-radius:9px;background:${C.verde};color:#fff;font-weight:700}.community-v2 .shareGrid button{padding:14px;border-radius:12px;background:${C.card};border:1px solid ${C.borde};color:${C.verdeOsc};font-weight:700}
.community-v2 .progress div{height:7px;border-radius:999px;background:${C.borde};margin:12px 0 8px;overflow:hidden}.community-v2 .progress div span{display:block;width:84%;height:100%;background:${C.verde};border-radius:inherit}.community-v2 .support p{color:rgba(255,255,255,.82);font-size:11px}.community-v2 .support button{flex-shrink:0;padding:10px 12px;border-radius:10px;background:${C.verdeOsc};color:#fff;font-weight:700}
.community-v2 .socials>div{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}.community-v2 .socials span{display:flex;align-items:center;gap:8px;font-size:12.5px;color:${C.textoSuave}}
.community-v2 .settings button{width:100%;min-height:58px;padding:0 16px;display:grid;grid-template-columns:28px 1fr 20px;align-items:center;gap:10px;border-bottom:1px solid ${C.borde};text-align:left;color:${C.texto};font-size:13.5px}.community-v2 .settings button:last-child{border-bottom:0}
`;document.head.appendChild(el)}
