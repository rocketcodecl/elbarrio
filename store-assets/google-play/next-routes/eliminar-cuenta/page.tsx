export const metadata = { title: 'Eliminar cuenta · El Barrio' }

export default function DeleteAccountPage() {
  return <main style={{ minHeight: '100vh', background: '#f5f8f6', color: '#18231d', fontFamily: 'Arial, sans-serif' }}>
    <header style={{ padding: '44px 22px 38px', background: '#1b9e75', color: '#fff' }}><div style={{ maxWidth: 720, margin: 'auto' }}><b style={{ fontSize: 12, letterSpacing: '.08em' }}>EL BARRIO</b><h1 style={{ margin: '8px 0 10px', fontSize: 42 }}>Eliminar mi cuenta</h1><p>Solicitud de eliminación de cuenta y datos asociados</p></div></header>
    <div style={{ maxWidth: 720, margin: 'auto', padding: '28px 22px 60px', lineHeight: 1.65 }}><article style={{ padding: 24, border: '1px solid #dce7df', borderRadius: 18, background: '#fff' }}>
      <h2>Desde la aplicación</h2><p>Abre <b>Perfil → Privacidad y seguridad → Eliminar mi cuenta</b> y confirma la solicitud. Esta es la vía más rápida.</p>
      <h2>Si ya no tienes acceso</h2><p>Escribe desde el correo asociado a tu cuenta a <a href="mailto:contacto@elbarrio.lat?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta%20El%20Barrio">contacto@elbarrio.lat</a> con el asunto <b>Solicitud de eliminación de cuenta El Barrio</b>. Incluye únicamente tu nombre y correo de registro. Nunca envíes tu contraseña ni una fotografía de tu RUT.</p>
      <a href="mailto:contacto@elbarrio.lat?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta%20El%20Barrio" style={{ display: 'inline-block', padding: '13px 17px', borderRadius: 10, background: '#126b4a', color: '#fff', fontWeight: 700 }}>Solicitar por correo</a>
      <h2>Qué se elimina</h2><p>Se revoca el acceso y se anonimizan los datos identificatorios, incluidos RUT, dirección, ubicación GPS, correo, teléfono y avatar.</p>
      <h2>Qué puede conservarse</h2><p>Algunas publicaciones, mensajes y registros mínimos de seguridad pueden conservarse sin identidad pública para preservar conversaciones, prevenir fraude o cumplir obligaciones aplicables.</p>
      <p><a href="/privacidad">Leer la Política de privacidad</a></p>
    </article></div>
  </main>
}
