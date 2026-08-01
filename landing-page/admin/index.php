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

function field_value(array $source, string $group, string $key): string
{
    return escape((string)($source[$group][$key] ?? ''));
}
?>
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="<?= escape(csrf_token()) ?>"><title>Editar landing · El Barrio</title><link rel="stylesheet" href="assets/admin.css"><script src="assets/admin.js" defer></script></head>
<body class="dashboard">
  <aside class="sidebar"><div class="admin-brand light"><span>EB</span><div><strong>El Barrio</strong><small>Landing pública</small></div></div><nav><a class="active" href="#hero">Inicio</a><a href="#comercios">Comercios</a><a href="#cierre">Cierre</a><a href="#tipografia">Tamaños</a></nav><div class="sidebar-bottom"><a href="<?= escape($siteUrl) ?>" target="_blank" rel="noopener">Ver landing ↗</a><a href="?logout=1">Cerrar sesión</a></div></aside>
  <main class="editor-shell">
    <header class="editor-header"><div><small>EDITOR DE CONTENIDO</small><h1>Landing de El Barrio</h1></div><div class="header-actions"><span class="save-state" data-status>Sin cambios</span><button class="secondary" type="button" data-reset>Restaurar</button><button type="button" data-save>Publicar cambios</button></div></header>
    <form class="editor-form" data-editor-form>
      <section class="editor-card" id="hero"><div class="card-heading"><span>1</span><div><h2>Portada principal</h2><p>El primer mensaje que verá una persona.</p></div></div><div class="field-grid"><label>Etiqueta superior<input name="content.hero.eyebrow" value="<?= field_value($content, 'hero', 'eyebrow') ?>"></label><label>Título<input name="content.hero.title" value="<?= field_value($content, 'hero', 'title') ?>"></label><label>Frase destacada<input name="content.hero.accent" value="<?= field_value($content, 'hero', 'accent') ?>"></label><label>Botón principal<input name="content.hero.primaryCta" value="<?= field_value($content, 'hero', 'primaryCta') ?>"></label><label class="wide">Descripción<textarea name="content.hero.lead"><?= field_value($content, 'hero', 'lead') ?></textarea></label></div></section>

      <section class="editor-card" id="comercios"><div class="card-heading"><span>2</span><div><h2>Historia para comercios</h2><p>Los cuatro momentos del scrollytelling comercial.</p></div></div><div class="field-grid"><label>Etiqueta<input name="content.commerce.eyebrow" value="<?= field_value($content, 'commerce', 'eyebrow') ?>"></label><label>Título inicial<input name="content.commerce.title" value="<?= field_value($content, 'commerce', 'title') ?>"></label><label class="wide">Frase destacada<input name="content.commerce.accent" value="<?= field_value($content, 'commerce', 'accent') ?>"></label><label class="wide">Introducción<textarea name="content.commerce.intro"><?= field_value($content, 'commerce', 'intro') ?></textarea></label><label>Título descubrimiento<textarea name="content.commerce.discoveryTitle"><?= field_value($content, 'commerce', 'discoveryTitle') ?></textarea></label><label>Texto descubrimiento<textarea name="content.commerce.discoveryBody"><?= field_value($content, 'commerce', 'discoveryBody') ?></textarea></label><label>Título confianza<textarea name="content.commerce.trustTitle"><?= field_value($content, 'commerce', 'trustTitle') ?></textarea></label><label>Texto confianza<textarea name="content.commerce.trustBody"><?= field_value($content, 'commerce', 'trustBody') ?></textarea></label><label>Título final<textarea name="content.commerce.closeTitle"><?= field_value($content, 'commerce', 'closeTitle') ?></textarea></label><label>Texto final<textarea name="content.commerce.closeBody"><?= field_value($content, 'commerce', 'closeBody') ?></textarea></label><label>Botón comercial<input name="content.commerce.cta" value="<?= field_value($content, 'commerce', 'cta') ?>"></label></div></section>

      <section class="editor-card" id="cierre"><div class="card-heading"><span>3</span><div><h2>Llamado final</h2><p>El mensaje que invita a dejar los datos.</p></div></div><div class="field-grid"><label class="wide">Título<input name="content.join.title" value="<?= field_value($content, 'join', 'title') ?>"></label><label class="wide">Descripción<textarea name="content.join.body"><?= field_value($content, 'join', 'body') ?></textarea></label></div></section>

      <section class="editor-card" id="tipografia"><div class="card-heading"><span>4</span><div><h2>Tamaños generales</h2><p>Ajustes seguros para no romper el diseño.</p></div></div><div class="range-grid"><label>Título del hero <output data-output="sizes.heroTitle"><?= (int)($sizes['heroTitle'] ?? 94) ?> px</output><input type="range" min="64" max="120" name="sizes.heroTitle" value="<?= (int)($sizes['heroTitle'] ?? 94) ?>"></label><label>Títulos de secciones <output data-output="sizes.sectionTitle"><?= (int)($sizes['sectionTitle'] ?? 72) ?> px</output><input type="range" min="48" max="90" name="sizes.sectionTitle" value="<?= (int)($sizes['sectionTitle'] ?? 72) ?>"></label><label>Texto general <output data-output="sizes.body"><?= (int)($sizes['body'] ?? 16) ?> px</output><input type="range" min="14" max="20" name="sizes.body" value="<?= (int)($sizes['body'] ?? 16) ?>"></label></div></section>
    </form>
  </main>
  <div class="toast" data-toast role="status"></div>
</body>
</html>
