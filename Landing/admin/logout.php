<?php

declare(strict_types=1);

/**
 * El Barrio
 * Cierre de sesión del panel administrativo.
 */

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/auth.php';

require_installation();

if (
    strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'POST'
) {
    $csrfToken = isset($_POST['csrf_token']) && is_string($_POST['csrf_token'])
        ? $_POST['csrf_token']
        : '';

    if (!auth_verify_csrf($csrfToken)) {
        http_response_code(419);
        exit('La sesión del formulario expiró.');
    }

    auth_logout();
}

if (!auth_check()) {
    auth_redirect(auth_login_url());
}

$user = auth_user();
$csrfToken = auth_csrf_token();

if (!headers_sent()) {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
}
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="theme-color" content="#173d2e">

    <title>Cerrar sesión | <?= e(APP_NAME) ?></title>

    <link
        rel="icon"
        href="<?= e(relative_url('favicon.svg')) ?>"
        type="image/svg+xml"
    >

    <style>
        :root {
            color-scheme: light;
            --ink: #17211c;
            --muted: #68736c;
            --paper: #f5f0e7;
            --surface: rgba(255, 255, 255, .94);
            --line: #ddd5c8;
            --green: #245b45;
            --green-dark: #173d2e;
            --terracotta: #c85d3d;
            --shadow: 0 28px 80px rgba(23, 33, 28, .14);
        }

        * {
            box-sizing: border-box;
        }

        html {
            font-family:
                Inter,
                ui-sans-serif,
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;
            color: var(--ink);
            background: var(--paper);
        }

        body {
            display: grid;
            min-width: 320px;
            min-height: 100vh;
            margin: 0;
            place-items: center;
            padding: 24px;
            background:
                radial-gradient(
                    circle at 15% 15%,
                    rgba(200, 93, 61, .16),
                    transparent 28rem
                ),
                radial-gradient(
                    circle at 85% 85%,
                    rgba(36, 91, 69, .18),
                    transparent 32rem
                ),
                var(--paper);
        }

        .card {
            width: min(100%, 500px);
            border: 1px solid rgba(255, 255, 255, .74);
            border-radius: 28px;
            padding: clamp(26px, 6vw, 44px);
            text-align: center;
            background: var(--surface);
            box-shadow: var(--shadow);
            backdrop-filter: blur(18px);
        }

        .brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: inherit;
            font-weight: 850;
            letter-spacing: -.03em;
            text-decoration: none;
        }

        .brand__mark {
            display: grid;
            width: 44px;
            aspect-ratio: 1;
            place-items: center;
            border-radius: 14px;
            color: white;
            background: var(--green);
        }

        .icon {
            display: grid;
            width: 76px;
            margin: 34px auto 22px;
            aspect-ratio: 1;
            place-items: center;
            border-radius: 50%;
            color: var(--terracotta);
            background: rgba(200, 93, 61, .1);
            font-size: 2rem;
        }

        h1 {
            margin: 0;
            font-size: clamp(2rem, 6vw, 3rem);
            line-height: 1;
            letter-spacing: -.055em;
        }

        p {
            margin: 16px auto 0;
            color: var(--muted);
            line-height: 1.65;
        }

        .user {
            margin-top: 10px;
            color: var(--ink);
            font-weight: 800;
        }

        .actions {
            display: grid;
            gap: 11px;
            margin-top: 30px;
        }

        .button {
            display: inline-flex;
            min-height: 51px;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 0 22px;
            color: var(--ink);
            background: white;
            font: inherit;
            font-weight: 820;
            text-decoration: none;
            cursor: pointer;
        }

        .button:hover {
            border-color: var(--green);
            color: var(--green);
        }

        .button--danger {
            border-color: var(--green);
            color: white;
            background: var(--green);
            box-shadow: 0 14px 30px rgba(36, 91, 69, .22);
        }

        .button--danger:hover {
            color: white;
            background: var(--green-dark);
        }
    </style>
</head>

<body>
<main class="card">
    <a class="brand" href="<?= e(relative_url('admin/')) ?>">
        <span class="brand__mark">EB</span>
        <span><?= e(APP_NAME) ?></span>
    </a>

    <span class="icon" aria-hidden="true">↪</span>

    <h1>¿Cerrar sesión?</h1>

    <p>
        La sesión administrativa se cerrará en este dispositivo.
    </p>

    <?php if ($user !== null): ?>
        <p class="user"><?= e($user['email'] ?? '') ?></p>
    <?php endif ?>

    <div class="actions">
        <form method="post" action="">
            <input
                type="hidden"
                name="csrf_token"
                value="<?= e($csrfToken) ?>"
            >

            <button class="button button--danger" type="submit">
                Sí, cerrar sesión
            </button>
        </form>

        <a class="button" href="<?= e(relative_url('admin/')) ?>">
            Volver al panel
        </a>
    </div>
</main>
</body>
</html>
