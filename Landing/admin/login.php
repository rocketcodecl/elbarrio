<?php

declare(strict_types=1);

/**
 * El Barrio
 * Acceso al panel administrativo.
 */

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/auth.php';

require_installation();

if (auth_check() && auth_user() !== null) {
    auth_redirect(auth_dashboard_url());
}

if (!headers_sent()) {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
}

$error = '';
$email = '';

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'POST') {
    $email = isset($_POST['email']) && is_string($_POST['email'])
        ? trim($_POST['email'])
        : '';

    $password = isset($_POST['password']) && is_string($_POST['password'])
        ? $_POST['password']
        : '';

    $csrfToken = isset($_POST['csrf_token']) && is_string($_POST['csrf_token'])
        ? $_POST['csrf_token']
        : '';

    if (!auth_verify_csrf($csrfToken)) {
        $error = 'La sesión del formulario expiró. Recarga la página e inténtalo nuevamente.';
    } else {
        try {
            $result = auth_attempt($email, $password);

            if ($result['success']) {
                auth_redirect(auth_pull_intended_url());
            }

            $error = $result['message'];
        } catch (Throwable $exception) {
            $error = APP_DEBUG
                ? $exception->getMessage()
                : 'No fue posible iniciar sesión en este momento.';
        }
    }
}

$csrfToken = auth_csrf_token();
?>
<!doctype html>
<html
    lang="es"
    data-environment="<?= e(APP_ENV) ?>"
>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="theme-color" content="#173d2e">

    <title>Acceso administrativo | <?= e(APP_NAME) ?></title>

    <link rel="icon" href="<?= e(relative_url('favicon.svg')) ?>" type="image/svg+xml">

    <style>
        :root {
            color-scheme: light;
            --ink: #17211c;
            --muted: #657069;
            --paper: #f4efe6;
            --surface: rgba(255, 255, 255, .94);
            --line: rgba(23, 33, 28, .13);
            --green: #245b45;
            --green-dark: #173d2e;
            --terracotta: #c85d3d;
            --danger: #9b342f;
            --focus: rgba(36, 91, 69, .18);
            --shadow: 0 28px 80px rgba(23, 33, 28, .16);
        }

        * {
            box-sizing: border-box;
        }

        html {
            min-width: 320px;
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
            min-height: 100vh;
            margin: 0;
            background:
                radial-gradient(
                    circle at 10% 12%,
                    rgba(200, 93, 61, .18),
                    transparent 30rem
                ),
                radial-gradient(
                    circle at 88% 86%,
                    rgba(36, 91, 69, .21),
                    transparent 34rem
                ),
                var(--paper);
        }

        button,
        input {
            font: inherit;
        }

        a {
            color: inherit;
        }

        .login-page {
            display: grid;
            min-height: 100vh;
            grid-template-columns:
                minmax(300px, .9fr)
                minmax(440px, 1.1fr);
        }

        .login-story {
            position: relative;
            display: flex;
            min-height: 100%;
            overflow: hidden;
            flex-direction: column;
            justify-content: space-between;
            padding: clamp(32px, 6vw, 76px);
            color: white;
            background:
                linear-gradient(
                    145deg,
                    rgba(23, 61, 46, .95),
                    rgba(23, 33, 28, .98)
                );
            isolation: isolate;
        }

        .login-story::before,
        .login-story::after {
            position: absolute;
            z-index: -1;
            border-radius: 50%;
            content: "";
            filter: blur(2px);
        }

        .login-story::before {
            top: -12rem;
            right: -10rem;
            width: 30rem;
            aspect-ratio: 1;
            background: rgba(200, 93, 61, .25);
        }

        .login-story::after {
            bottom: -14rem;
            left: -8rem;
            width: 34rem;
            aspect-ratio: 1;
            background: rgba(255, 255, 255, .08);
        }

        .brand {
            display: inline-flex;
            width: fit-content;
            align-items: center;
            gap: 12px;
            font-weight: 850;
            letter-spacing: -.03em;
            text-decoration: none;
        }

        .brand__mark {
            display: grid;
            width: 46px;
            aspect-ratio: 1;
            place-items: center;
            border: 1px solid rgba(255, 255, 255, .15);
            border-radius: 15px;
            background: rgba(255, 255, 255, .1);
            box-shadow: 0 14px 30px rgba(0, 0, 0, .15);
        }

        .story-copy {
            max-width: 34rem;
            padding-block: 70px;
        }

        .eyebrow {
            margin: 0 0 14px;
            color: #efaa8f;
            font-size: .78rem;
            font-weight: 850;
            letter-spacing: .15em;
            text-transform: uppercase;
        }

        .story-copy h1 {
            max-width: 11ch;
            margin: 0;
            font-size: clamp(2.8rem, 6vw, 5.8rem);
            line-height: .92;
            letter-spacing: -.065em;
        }

        .story-copy p {
            max-width: 36rem;
            margin: 24px 0 0;
            color: rgba(255, 255, 255, .72);
            font-size: clamp(1rem, 1.6vw, 1.2rem);
            line-height: 1.7;
        }

        .story-footer {
            color: rgba(255, 255, 255, .56);
            font-size: .83rem;
        }

        .login-main {
            display: grid;
            min-height: 100%;
            place-items: center;
            padding: clamp(24px, 6vw, 70px);
        }

        .login-card {
            width: min(100%, 480px);
            border: 1px solid rgba(255, 255, 255, .72);
            border-radius: 30px;
            padding: clamp(26px, 5vw, 46px);
            background: var(--surface);
            box-shadow: var(--shadow);
            backdrop-filter: blur(18px);
        }

        .login-card h2 {
            margin: 0;
            font-size: clamp(2rem, 4vw, 2.8rem);
            line-height: 1;
            letter-spacing: -.055em;
        }

        .login-card > p {
            margin: 14px 0 0;
            color: var(--muted);
            line-height: 1.65;
        }

        .alert {
            margin-top: 24px;
            border: 1px solid rgba(155, 52, 47, .24);
            border-radius: 15px;
            padding: 14px 16px;
            color: #742622;
            background: rgba(155, 52, 47, .08);
            font-size: .9rem;
            line-height: 1.5;
        }

        .form {
            display: grid;
            gap: 19px;
            margin-top: 30px;
        }

        .field {
            display: grid;
            gap: 8px;
        }

        .field__heading {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 12px;
        }

        label {
            font-size: .88rem;
            font-weight: 780;
        }

        .field__hint {
            color: var(--muted);
            font-size: .74rem;
        }

        .input-wrap {
            position: relative;
        }

        input {
            width: 100%;
            min-height: 52px;
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 0 15px;
            color: var(--ink);
            background: white;
            outline: none;
            transition:
                border-color .2s ease,
                box-shadow .2s ease,
                transform .2s ease;
        }

        input:hover {
            border-color: rgba(36, 91, 69, .35);
        }

        input:focus {
            border-color: var(--green);
            box-shadow: 0 0 0 4px var(--focus);
        }

        input[type="password"] {
            padding-right: 56px;
        }

        .password-toggle {
            position: absolute;
            top: 50%;
            right: 8px;
            display: grid;
            width: 40px;
            aspect-ratio: 1;
            place-items: center;
            border: 0;
            border-radius: 10px;
            color: var(--muted);
            background: transparent;
            cursor: pointer;
            transform: translateY(-50%);
        }

        .password-toggle:hover,
        .password-toggle:focus-visible {
            color: var(--green);
            background: rgba(36, 91, 69, .08);
            outline: none;
        }

        .submit {
            display: inline-flex;
            min-height: 54px;
            align-items: center;
            justify-content: center;
            border: 0;
            border-radius: 999px;
            padding: 0 24px;
            color: white;
            background: var(--green);
            font-weight: 850;
            cursor: pointer;
            box-shadow: 0 14px 30px rgba(36, 91, 69, .24);
            transition:
                background .2s ease,
                transform .2s ease,
                box-shadow .2s ease;
        }

        .submit:hover {
            background: var(--green-dark);
            transform: translateY(-1px);
            box-shadow: 0 18px 34px rgba(36, 91, 69, .28);
        }

        .submit:active {
            transform: translateY(0);
        }

        .submit:focus-visible {
            outline: 4px solid var(--focus);
            outline-offset: 3px;
        }

        .back-link {
            display: inline-flex;
            margin-top: 24px;
            align-items: center;
            gap: 8px;
            color: var(--muted);
            font-size: .86rem;
            font-weight: 700;
            text-decoration: none;
        }

        .back-link:hover {
            color: var(--green);
        }

        .security-note {
            display: flex;
            margin-top: 26px;
            align-items: flex-start;
            gap: 10px;
            color: var(--muted);
            font-size: .76rem;
            line-height: 1.5;
        }

        .security-note svg {
            flex: 0 0 auto;
            margin-top: 1px;
        }

        @media (max-width: 860px) {
            .login-page {
                grid-template-columns: 1fr;
            }

            .login-story {
                min-height: auto;
                padding: 28px 24px 44px;
            }

            .story-copy {
                padding-block: 54px 26px;
            }

            .story-copy h1 {
                max-width: 12ch;
                font-size: clamp(2.7rem, 12vw, 4.7rem);
            }

            .story-footer {
                display: none;
            }

            .login-main {
                min-height: auto;
                padding: 28px 14px 48px;
            }

            .login-card {
                margin-top: -30px;
                border-radius: 24px;
                padding: 26px 22px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                scroll-behavior: auto !important;
                transition-duration: .01ms !important;
                animation-duration: .01ms !important;
                animation-iteration-count: 1 !important;
            }
        }
    </style>
</head>

<body>
<div class="login-page">
    <aside class="login-story">
        <a class="brand" href="<?= e(relative_url('')) ?>">
            <span class="brand__mark" aria-hidden="true">EB</span>
            <span><?= e(APP_NAME) ?></span>
        </a>

        <div class="story-copy">
            <p class="eyebrow">Panel administrativo</p>
            <h1>Gestiona lo que mueve al barrio.</h1>
            <p>
                Actualiza contenidos, revisa mensajes y administra la
                experiencia pública desde un espacio seguro.
            </p>
        </div>

        <p class="story-footer">
            <?= e(APP_NAME) ?> · Administración del sitio
        </p>
    </aside>

    <main class="login-main">
        <section class="login-card" aria-labelledby="login-title">
            <p class="eyebrow">Acceso seguro</p>
            <h2 id="login-title">Bienvenido</h2>
            <p>Ingresa con la cuenta creada durante la instalación.</p>

            <?php if ($error !== ''): ?>
                <div class="alert" role="alert">
                    <?= e($error) ?>
                </div>
            <?php endif ?>

            <form class="form" method="post" action="" novalidate>
                <input
                    type="hidden"
                    name="csrf_token"
                    value="<?= e($csrfToken) ?>"
                >

                <div class="field">
                    <label for="email">Correo electrónico</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value="<?= e($email) ?>"
                        required
                        maxlength="190"
                        autocomplete="username"
                        inputmode="email"
                        autofocus
                    >
                </div>

                <div class="field">
                    <div class="field__heading">
                        <label for="password">Contraseña</label>
                        <span class="field__hint">Mínimo 12 caracteres</span>
                    </div>

                    <div class="input-wrap">
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            autocomplete="current-password"
                        >

                        <button
                            class="password-toggle"
                            type="button"
                            aria-label="Mostrar contraseña"
                            aria-pressed="false"
                            data-password-toggle
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                                    stroke="currentColor"
                                    stroke-width="1.8"
                                />
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="2.8"
                                    stroke="currentColor"
                                    stroke-width="1.8"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <button class="submit" type="submit">
                    Entrar al panel
                </button>
            </form>

            <a class="back-link" href="<?= e(relative_url('')) ?>">
                <span aria-hidden="true">←</span>
                Volver al sitio público
            </a>

            <div class="security-note">
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M7 10V8a5 5 0 0 1 10 0v2"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                    />
                    <rect
                        x="5"
                        y="10"
                        width="14"
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        stroke-width="1.8"
                    />
                </svg>

                <span>
                    La sesión expira automáticamente después de un periodo
                    de inactividad y los intentos fallidos están limitados.
                </span>
            </div>
        </section>
    </main>
</div>

<script>
(() => {
    'use strict';

    const toggle = document.querySelector('[data-password-toggle]');
    const password = document.querySelector('#password');

    if (
        !(toggle instanceof HTMLButtonElement)
        || !(password instanceof HTMLInputElement)
    ) {
        return;
    }

    toggle.addEventListener('click', () => {
        const isVisible = password.type === 'text';

        password.type = isVisible ? 'password' : 'text';
        toggle.setAttribute('aria-pressed', String(!isVisible));
        toggle.setAttribute(
            'aria-label',
            isVisible ? 'Mostrar contraseña' : 'Ocultar contraseña'
        );

        password.focus({
            preventScroll: true
        });
    });
})();
</script>
</body>
</html>
