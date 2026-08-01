<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (installed()) {
    header('Location: index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    $confirmation = (string)($_POST['confirmation'] ?? '');

    if (mb_strlen($username) < 3) {
        $error = 'El usuario debe tener al menos 3 caracteres.';
    } elseif (strlen($password) < 10) {
        $error = 'Usa una contraseña de al menos 10 caracteres.';
    } elseif (!hash_equals($password, $confirmation)) {
        $error = 'Las contraseñas no coinciden.';
    } elseif (!is_writable(__DIR__) || !is_writable(CONTENT_DIR)) {
        $error = 'El servidor necesita permiso de escritura en admin/ y content/.';
    } else {
        $config = "<?php\nreturn " . var_export([
            'username' => $username,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'site_url' => 'https://elbarrio.lat',
            'installed_at' => gmdate('c'),
        ], true) . ";\n";

        if (file_put_contents(ADMIN_CONFIG, $config, LOCK_EX) === false) {
            $error = 'No fue posible crear la configuración del administrador.';
        } else {
            if (!is_file(CONTENT_FILE)) {
                copy(DEFAULTS_FILE, CONTENT_FILE);
            }
            $_SESSION['landing_admin'] = true;
            session_regenerate_id(true);
            header('Location: index.php?installed=1');
            exit;
        }
    }
}
?>
<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instalar · El Barrio</title><link rel="stylesheet" href="assets/admin.css"></head>
<body class="auth-page"><main class="auth-card"><div class="admin-brand"><span>EB</span><div><strong>El Barrio</strong><small>Instalación de la landing</small></div></div><h1>Configura tu acceso</h1><p>Este paso se ejecuta una sola vez. La contraseña se guarda cifrada.</p><?php if ($error): ?><div class="notice error"><?= escape($error) ?></div><?php endif; ?><form method="post" class="stack"><label>Usuario<input name="username" autocomplete="username" required></label><label>Contraseña<input type="password" name="password" autocomplete="new-password" minlength="10" required></label><label>Repetir contraseña<input type="password" name="confirmation" autocomplete="new-password" minlength="10" required></label><button type="submit">Instalar panel</button></form><small class="auth-note">Necesitas PHP 8.1 o superior y permisos de escritura en las carpetas admin y content.</small></main></body></html>
