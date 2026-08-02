<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (!installed()) {
    header('Location: install.php');
    exit;
}

if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: index.php');
    exit;
}

$loginError = '';
if (!is_logged_in() && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $config = admin_config();
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    if (hash_equals((string)($config['username'] ?? ''), $username) && password_verify($password, (string)($config['password_hash'] ?? ''))) {
        $_SESSION['landing_admin'] = true;
        session_regenerate_id(true);
        header('Location: index.php');
        exit;
    }
    usleep(350000);
    $loginError = 'Usuario o contraseña incorrectos.';
}

if (!is_logged_in()):
?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ingresar · El Barrio</title><link rel="stylesheet" href="assets/admin.css"></head><body class="auth-page"><main class="auth-card"><div class="admin-brand"><span>EB</span><div><strong>El Barrio</strong><small>Editor de la landing</small></div></div><h1>Bienvenido</h1><p>Ingresa para modificar el contenido público.</p><?php if ($loginError): ?><div class="notice error"><?= escape($loginError) ?></div><?php endif; ?><form method="post" class="stack"><label>Usuario<input name="username" autocomplete="username" required autofocus></label><label>Contraseña<input type="password" name="password" autocomplete="current-password" required></label><button type="submit">Entrar al panel</button></form></main></body></html>
<?php
exit;
endif;

$data = read_json_file(CONTENT_FILE) ?: read_json_file(DEFAULTS_FILE);
$content = $data['content'] ?? [];
$sizes = $data['sizes'] ?? [];
$siteUrl = (string)(admin_config()['site_url'] ?? 'https://elbarrio.lat');
$leads = fetch_remote_leads();

function field_value(array $source, string $group, string $key): string
{
    return escape((string)($source[$group][$key] ?? ''));
}
?>
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="<?= escape(csrf_token()) ?>"><title>Editar landing · El Barrio</title><link rel="stylesheet" href="assets/admin.css"><link rel="stylesheet" href="assets/leads.css"><script src="assets/admin.js" defer></script></head>
<body class="dashboard">
  <aside class="sidebar"><div class="admin-brand light"><span>EB</span><div><strong>El Barrio</strong><small>Landing pública</small></div></div><nav><a class="active" href="#hero">Inicio</a><a href="#videos">Videos</a><a href="#imagenes">Imágenes</a><a href="#comercios">Comercios</a><a href="#cierre">Cierre</a><a href="#inscritos">Inscritos</a><a href="#tipografia">Tamaños</a></nav><div class="sidebar-bottom"><a href="<?= escape($siteUrl) ?>" target="_blank" rel="noopener">Ver landing ↗</a><a href="?logout=1">Cerrar sesión</a></div></aside>
  <main class="editor-shell">
    <header class="editor-header"><div><small>EDITOR DE CONTENIDO</small><h1>Landing de El Barrio</h1></div><div class="header-actions"><span class="save-state" data-status>Sin cambios</span><button class="secondary" type="button" data-reset>Restaurar</button><button type="button" data-save>Publicar cambios</button></div></header>
    <form class="editor-form" data-editor-form>
      <section class="editor-card" id="hero"><div class="card-heading"><span>1</span><div><h2>Portada principal</h2><p>El primer mensaje que verá una persona.</p></div></div><div class="field-grid"><label>Etiqueta superior<input name="content.hero.eyebrow" value="<?= field_value($content, 'hero', 'eyebrow') ?>"></label><label>Título<input name="content.hero.title" value="<?= field_value($content, 'hero', 'title') ?>"></label><label>Frase normal<input name="content.hero.accent" value="<?= field_value($content, 'hero', 'accent') ?>"></label><label>Botón principal<input name="content.hero.primaryCta" value="<?= field_value($content, 'hero', 'primaryCta') ?>"></label><label class="wide">Descripción<textarea name="content.hero.lead"><?= field_value($content, 'hero', 'lead') ?></textarea></label></div></section>

      <section class="editor-card" id="navegacion"><div class="card-heading"><span>☰</span><div><h2>Navegación y portada</h2><p>Menú, botones secundarios y prueba social.</p></div></div><div class="field-grid"><?php foreach (['how'=>'Cómo funciona','neighbors'=>'Para vecinos','commerce'=>'Para comercios','services'=>'Para servicios','cta'=>'Botón del menú'] as $key=>$label): ?><label><?= escape($label) ?><input name="content.nav.<?= escape($key) ?>" value="<?= field_value($content,'nav',$key) ?>"></label><?php endforeach; ?><?php foreach (['secondaryCta'=>'Botón secundario','proofTitle'=>'Prueba social · título','proofBody'=>'Prueba social · texto'] as $key=>$label): ?><label><?= escape($label) ?><input name="content.hero.<?= escape($key) ?>" value="<?= field_value($content,'hero',$key) ?>"></label><?php endforeach; ?></div></section>

      <section class="editor-card" id="relato"><div class="card-heading"><span>01</span><div><h2>Relato inicial</h2><p>Las cuatro escenas que presentan el problema y la promesa.</p></div></div><div class="field-grid"><?php foreach (['one'=>'Escena 1','two'=>'Escena 2','three'=>'Escena 3','four'=>'Escena 4'] as $prefix=>$label): ?><label><?= escape($label) ?> · etiqueta<input name="content.cinema.<?= $prefix ?>Label" value="<?= field_value($content,'cinema',$prefix.'Label') ?>"></label><label><?= escape($label) ?> · título<textarea name="content.cinema.<?= $prefix ?>Title"><?= field_value($content,'cinema',$prefix.'Title') ?></textarea></label><label class="wide"><?= escape($label) ?> · texto<textarea name="content.cinema.<?= $prefix ?>Body"><?= field_value($content,'cinema',$prefix.'Body') ?></textarea></label><?php endforeach; ?></div></section>

      <section class="editor-card" id="historia"><div class="card-heading"><span>02</span><div><h2>Historia de Marta</h2><p>El caso concreto que demuestra cómo funciona El Barrio.</p></div></div><div class="field-grid"><label>Etiqueta<input name="content.story.eyebrow" value="<?= field_value($content,'story','eyebrow') ?>"></label><label>Título<textarea name="content.story.title"><?= field_value($content,'story','title') ?></textarea></label><label class="wide">Introducción<textarea name="content.story.intro"><?= field_value($content,'story','intro') ?></textarea></label><?php foreach (['one'=>'Paso 1','two'=>'Paso 2','three'=>'Paso 3','four'=>'Paso 4'] as $prefix=>$label): ?><label><?= escape($label) ?> · etiqueta<input name="content.story.<?= $prefix ?>Label" value="<?= field_value($content,'story',$prefix.'Label') ?>"></label><label><?= escape($label) ?> · título<textarea name="content.story.<?= $prefix ?>Title"><?= field_value($content,'story',$prefix.'Title') ?></textarea></label><label><?= escape($label) ?> · texto<textarea name="content.story.<?= $prefix ?>Body"><?= field_value($content,'story',$prefix.'Body') ?></textarea></label><label><?= escape($label) ?> · cita<textarea name="content.story.<?= $prefix ?>Quote"><?= field_value($content,'story',$prefix.'Quote') ?></textarea></label><?php endforeach; ?></div></section>

      <section class="editor-card" id="servicios-textos"><div class="card-heading"><span>03</span><div><h2>Historia para servicios</h2><p>Los cuatro momentos del scrollytelling profesional.</p></div></div><div class="field-grid"><?php foreach (['eyebrow'=>'Etiqueta','title'=>'Título inicial','accent'=>'Palabras clave','body'=>'Introducción','discoveryTitle'=>'Título descubrimiento','discoveryBody'=>'Texto descubrimiento','trustTitle'=>'Título confianza','trustBody'=>'Texto confianza','closeTitle'=>'Título final','closeBody'=>'Texto final','cta'=>'Botón'] as $key=>$label): ?><label class="<?= str_contains($key,'Body') || $key==='body' ? 'wide' : '' ?>"><?= escape($label) ?><textarea name="content.services.<?= escape($key) ?>"><?= field_value($content,'services',$key) ?></textarea></label><?php endforeach; ?></div></section>

      <section class="editor-card" id="videos"><div class="card-heading"><span>▶</span><div><h2>Videos del scrollytelling</h2><p>Reemplaza cada placeholder por un MP4 de hasta 25 MB.</p></div></div><div class="media-upload-grid"><?php foreach (['distancia' => '01 · Distancia', 'pregunta' => '02 · La pregunta', 'encuentro' => '03 · El encuentro', 'comunidad' => '04 · Comunidad'] as $slot => $label): ?><label class="media-upload"><strong><?= escape($label) ?></strong><small>Video MP4</small><input type="file" accept="video/mp4" data-media-upload="<?= escape($slot) ?>"><span>Seleccionar y subir</span></label><?php endforeach; ?></div></section>

      <section class="editor-card" id="imagenes"><div class="card-heading"><span>▧</span><div><h2>Imágenes de la historia</h2><p>El fondo grande y la imagen dentro del teléfono se eligen por separado.</p></div></div><div class="media-upload-grid"><?php foreach (['hero-phone' => 'Hero · Imagen de aplicación', 'bg-inicio' => 'Fondo · Marta', 'phone-inicio' => 'Teléfono · Marta', 'bg-servicios' => 'Fondo · Servicios', 'phone-servicios' => 'Teléfono · Servicios', 'bg-mercado' => 'Fondo · Comercio', 'phone-mercado' => 'Teléfono · Comercio', 'bg-eventos' => 'Fondo · Comunidad', 'phone-eventos' => 'Teléfono · Comunidad', 'screen-inicio' => 'Pantalla · Inicio', 'screen-servicios' => 'Pantalla · Servicios', 'screen-mercado' => 'Pantalla · Comercios', 'screen-eventos' => 'Pantalla · Eventos', 'commerce-panel-1' => 'Comercio · Paso 1', 'commerce-panel-2' => 'Comercio · Paso 2', 'commerce-panel-3' => 'Comercio · Paso 3', 'commerce-panel-4' => 'Comercio · Paso 4', 'service-panel-1' => 'Servicio · Paso 1', 'service-panel-2' => 'Servicio · Paso 2', 'service-panel-3' => 'Servicio · Paso 3', 'service-panel-4' => 'Servicio · Paso 4'] as $slot => $label): ?><label class="media-upload"><strong><?= escape($label) ?></strong><small>JPG, PNG o WEBP</small><input type="file" accept="image/jpeg,image/png,image/webp" data-image-upload="<?= escape($slot) ?>"><span>Seleccionar y subir</span></label><?php endforeach; ?></div></section>

      <section class="editor-card" id="comercios"><div class="card-heading"><span>2</span><div><h2>Historia para comercios</h2><p>Los cuatro momentos del scrollytelling comercial.</p></div></div><div class="field-grid"><label>Etiqueta<input name="content.commerce.eyebrow" value="<?= field_value($content, 'commerce', 'eyebrow') ?>"></label><label>Título inicial<input name="content.commerce.title" value="<?= field_value($content, 'commerce', 'title') ?>"></label><label class="wide">Frase destacada<input name="content.commerce.accent" value="<?= field_value($content, 'commerce', 'accent') ?>"></label><label class="wide">Introducción<textarea name="content.commerce.intro"><?= field_value($content, 'commerce', 'intro') ?></textarea></label><label>Título descubrimiento<textarea name="content.commerce.discoveryTitle"><?= field_value($content, 'commerce', 'discoveryTitle') ?></textarea></label><label>Texto descubrimiento<textarea name="content.commerce.discoveryBody"><?= field_value($content, 'commerce', 'discoveryBody') ?></textarea></label><label>Título confianza<textarea name="content.commerce.trustTitle"><?= field_value($content, 'commerce', 'trustTitle') ?></textarea></label><label>Texto confianza<textarea name="content.commerce.trustBody"><?= field_value($content, 'commerce', 'trustBody') ?></textarea></label><label>Título final<textarea name="content.commerce.closeTitle"><?= field_value($content, 'commerce', 'closeTitle') ?></textarea></label><label>Texto final<textarea name="content.commerce.closeBody"><?= field_value($content, 'commerce', 'closeBody') ?></textarea></label><label>Botón comercial<input name="content.commerce.cta" value="<?= field_value($content, 'commerce', 'cta') ?>"></label></div></section>

      <section class="editor-card" id="cierre"><div class="card-heading"><span>3</span><div><h2>Llamado final</h2><p>El mensaje que invita a dejar los datos.</p></div></div><div class="field-grid"><label class="wide">Título<input name="content.join.title" value="<?= field_value($content, 'join', 'title') ?>"></label><label class="wide">Descripción<textarea name="content.join.body"><?= field_value($content, 'join', 'body') ?></textarea></label></div></section>

      <section class="editor-card" id="formulario-textos"><div class="card-heading"><span>✎</span><div><h2>Formulario y apertura</h2><p>Prueba social, estado de apertura y mensajes del formulario.</p></div></div><div class="field-grid"><?php foreach (['eyebrow'=>'Etiqueta','proofTitle'=>'Prueba social · título','proofBody'=>'Prueba social · texto','openingTitle'=>'Apertura · título','openingBody'=>'Apertura · texto','openingStatus'=>'Apertura · estado','formTitle'=>'Formulario · título','formBody'=>'Formulario · bajada','participantLabel'=>'Selector · título','neighborOption'=>'Opción vecino','commerceOption'=>'Opción comercio','serviceOption'=>'Opción servicio','nameLabel'=>'Campo nombre','namePlaceholder'=>'Ejemplo nombre','emailLabel'=>'Campo correo','emailPlaceholder'=>'Ejemplo correo','whatsappLabel'=>'Campo WhatsApp','whatsappPlaceholder'=>'Ejemplo WhatsApp','comunaLabel'=>'Campo comuna','comunaPlaceholder'=>'Ejemplo comuna','formCta'=>'Formulario · botón','formNote'=>'Formulario · nota'] as $key=>$label): ?><label><?= escape($label) ?><textarea name="content.join.<?= escape($key) ?>"><?= field_value($content,'join',$key) ?></textarea></label><?php endforeach; ?></div></section>

      <section class="editor-card" id="footer-textos"><div class="card-heading"><span>↓</span><div><h2>Footer</h2><p>Textos de identidad y estado del lanzamiento.</p></div></div><div class="field-grid"><?php foreach (['tagline'=>'Descripción','statusTitle'=>'Estado · título','statusBody'=>'Estado · texto','copyright'=>'Copyright','signature'=>'Firma'] as $key=>$label): ?><label><?= escape($label) ?><input name="content.footer.<?= escape($key) ?>" value="<?= field_value($content,'footer',$key) ?>"></label><?php endforeach; ?></div></section>

      <section class="editor-card" id="inscritos"><div class="card-heading"><span>4</span><div><h2>Acceso anticipado</h2><p><?= count($leads) ?> personas inscritas desde la landing.</p></div></div><div class="lead-table-wrap"><table class="lead-table"><thead><tr><th>Nombre</th><th>Perfil</th><th>Comuna</th><th>WhatsApp</th><th>Correo</th><th>Registro</th></tr></thead><tbody><?php if (!$leads): ?><tr><td colspan="6" class="lead-empty">Todavía no hay personas inscritas.</td></tr><?php else: ?><?php foreach ($leads as $lead): ?><tr><td><strong><?= escape((string)($lead['name'] ?? '')) ?></strong></td><td><?= escape((string)($lead['type'] ?? '')) ?></td><td><?= escape((string)($lead['comuna'] ?? '')) ?></td><td><?= escape((string)($lead['whatsapp'] ?? '')) ?></td><td><?= escape((string)($lead['email'] ?? '')) ?></td><td><?= escape(substr((string)($lead['created_at'] ?? ''), 0, 10)) ?></td></tr><?php endforeach; ?><?php endif; ?></tbody></table></div></section>

      <section class="editor-card" id="tipografia"><div class="card-heading"><span>4</span><div><h2>Tamaños generales</h2><p>Ajustes seguros para no romper el diseño.</p></div></div><div class="range-grid"><label>Título del hero <output data-output="sizes.heroTitle"><?= (int)($sizes['heroTitle'] ?? 72) ?> px</output><input type="range" min="48" max="90" name="sizes.heroTitle" value="<?= (int)($sizes['heroTitle'] ?? 72) ?>"></label><label>Títulos de secciones <output data-output="sizes.sectionTitle"><?= (int)($sizes['sectionTitle'] ?? 72) ?> px</output><input type="range" min="48" max="90" name="sizes.sectionTitle" value="<?= (int)($sizes['sectionTitle'] ?? 72) ?>"></label><label>Texto general <output data-output="sizes.body"><?= (int)($sizes['body'] ?? 16) ?> px</output><input type="range" min="14" max="20" name="sizes.body" value="<?= (int)($sizes['body'] ?? 16) ?>"></label></div></section>
    </form>
  </main>
  <div class="toast" data-toast role="status"></div>
</body>
</html>
