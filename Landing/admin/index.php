<?php

declare(strict_types=1);

/**
 * El Barrio
 * Dashboard principal del panel administrativo.
 */

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/auth.php';

require_installation();
auth_require_login();

$user = auth_user();

$stats = [
    'messages' => 0,
    'subscribers' => 0,
    'pages' => 0,
    'media' => 0,
];

$recentMessages = [];
$recentActivity = [];

try {
    $stats['messages'] = (int) (
        db_fetch_one(
            "SELECT COUNT(*) AS total
             FROM contact_messages
             WHERE status = 'new'"
        )['total'] ?? 0
    );

    $stats['subscribers'] = (int) (
        db_fetch_one(
            "SELECT COUNT(*) AS total
             FROM subscribers
             WHERE status = 'active'"
        )['total'] ?? 0
    );

    $stats['pages'] = (int) (
        db_fetch_one(
            "SELECT COUNT(*) AS total
             FROM pages
             WHERE status = 'published'"
        )['total'] ?? 0
    );

    $stats['media'] = (int) (
        db_fetch_one(
            'SELECT COUNT(*) AS total FROM media'
        )['total'] ?? 0
    );

    $recentMessages = db_fetch_all(
        'SELECT id, name, email, subject, status, created_at
         FROM contact_messages
         ORDER BY created_at DESC
         LIMIT 5'
    );

    $recentActivity = db_fetch_all(
        'SELECT
            activity_logs.action,
            activity_logs.description,
            activity_logs.created_at,
            users.name AS user_name
         FROM activity_logs
         LEFT JOIN users ON users.id = activity_logs.user_id
         ORDER BY activity_logs.created_at DESC
         LIMIT 6'
    );
} catch (Throwable $exception) {
    $dashboardError = APP_DEBUG
        ? $exception->getMessage()
        : 'No fue posible cargar todos los datos del panel.';
}

function admin_datetime(?string $value): string
{
    if ($value === null || $value === '') {
        return '—';
    }

    $timestamp = strtotime($value);

    return $timestamp === false
        ? $value
        : date('d/m/Y H:i', $timestamp);
}

function admin_initials(string $name): string
{
    $parts = preg_split('/\s+/', trim($name)) ?: [];
    $initials = '';

    foreach (array_slice($parts, 0, 2) as $part) {
        $initials .= mb_substr($part, 0, 1);
    }

    return mb_strtoupper($initials !== '' ? $initials : 'A');
}
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="theme-color" content="#173d2e">

    <title>Panel administrativo | <?= e(APP_NAME) ?></title>

    <link
        rel="icon"
        href="<?= e(relative_url('favicon.svg')) ?>"
        type="image/svg+xml"
    >

    <style>
        :root {
            color-scheme: light;
            --ink: #17211c;
            --muted: #69736d;
            --paper: #f5f1e9;
            --surface: #fff;
            --line: #e2dbcf;
            --green: #245b45;
            --green-dark: #173d2e;
            --green-soft: #e8f0eb;
            --terracotta: #c85d3d;
            --danger: #a43b35;
            --shadow: 0 18px 50px rgba(23, 33, 28, .08);
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
            min-width: 320px;
            min-height: 100vh;
            margin: 0;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        button {
            font: inherit;
        }

        .admin-shell {
            display: grid;
            min-height: 100vh;
            grid-template-columns: 260px minmax(0, 1fr);
        }

        .sidebar {
            position: sticky;
            top: 0;
            display: flex;
            height: 100vh;
            flex-direction: column;
            padding: 24px 18px;
            color: white;
            background: var(--green-dark);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 0 10px 24px;
            font-weight: 850;
            letter-spacing: -.03em;
        }

        .brand__mark {
            display: grid;
            width: 42px;
            aspect-ratio: 1;
            place-items: center;
            border-radius: 13px;
            background: rgba(255, 255, 255, .1);
        }

        .nav {
            display: grid;
            gap: 5px;
            margin-top: 12px;
        }

        .nav__label {
            margin: 18px 12px 7px;
            color: rgba(255, 255, 255, .42);
            font-size: .7rem;
            font-weight: 850;
            letter-spacing: .12em;
            text-transform: uppercase;
        }

        .nav__link {
            display: flex;
            min-height: 44px;
            align-items: center;
            gap: 11px;
            border-radius: 12px;
            padding: 0 12px;
            color: rgba(255, 255, 255, .72);
            font-size: .9rem;
            font-weight: 700;
        }

        .nav__link:hover,
        .nav__link--active {
            color: white;
            background: rgba(255, 255, 255, .1);
        }

        .nav__icon {
            width: 20px;
            text-align: center;
        }

        .sidebar__footer {
            margin-top: auto;
            padding-top: 20px;
        }

        .user-card {
            display: flex;
            align-items: center;
            gap: 11px;
            border-top: 1px solid rgba(255, 255, 255, .1);
            padding: 20px 10px 0;
        }

        .user-card__avatar {
            display: grid;
            width: 38px;
            flex: 0 0 auto;
            aspect-ratio: 1;
            place-items: center;
            border-radius: 50%;
            color: var(--green-dark);
            background: white;
            font-size: .75rem;
            font-weight: 900;
        }

        .user-card__info {
            min-width: 0;
        }

        .user-card strong,
        .user-card small {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .user-card strong {
            font-size: .84rem;
        }

        .user-card small {
            margin-top: 2px;
            color: rgba(255, 255, 255, .48);
            font-size: .72rem;
        }

        .main {
            min-width: 0;
            padding: 30px;
        }

        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
        }

        .topbar h1 {
            margin: 0;
            font-size: clamp(1.8rem, 4vw, 2.7rem);
            letter-spacing: -.05em;
        }

        .topbar p {
            margin: 7px 0 0;
            color: var(--muted);
        }

        .topbar__actions {
            display: flex;
            gap: 10px;
        }

        .button {
            display: inline-flex;
            min-height: 43px;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 0 17px;
            color: var(--ink);
            background: white;
            font-weight: 780;
        }

        .button:hover {
            border-color: var(--green);
            color: var(--green);
        }

        .button--primary {
            border-color: var(--green);
            color: white;
            background: var(--green);
        }

        .button--primary:hover {
            color: white;
            background: var(--green-dark);
        }

        .alert {
            margin-bottom: 22px;
            border: 1px solid rgba(164, 59, 53, .24);
            border-radius: 14px;
            padding: 14px 16px;
            color: #782b27;
            background: rgba(164, 59, 53, .08);
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
        }

        .stat {
            border: 1px solid var(--line);
            border-radius: 20px;
            padding: 20px;
            background: var(--surface);
            box-shadow: var(--shadow);
        }

        .stat__top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .stat__icon {
            display: grid;
            width: 42px;
            aspect-ratio: 1;
            place-items: center;
            border-radius: 13px;
            color: var(--green);
            background: var(--green-soft);
        }

        .stat__value {
            display: block;
            margin-top: 22px;
            font-size: 2rem;
            font-weight: 900;
            letter-spacing: -.05em;
        }

        .stat__label {
            display: block;
            margin-top: 3px;
            color: var(--muted);
            font-size: .82rem;
        }

        .grid {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr);
            gap: 18px;
            margin-top: 18px;
        }

        .panel {
            min-width: 0;
            border: 1px solid var(--line);
            border-radius: 20px;
            background: var(--surface);
            box-shadow: var(--shadow);
        }

        .panel__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 20px 22px;
            border-bottom: 1px solid var(--line);
        }

        .panel__header h2 {
            margin: 0;
            font-size: 1rem;
            letter-spacing: -.02em;
        }

        .panel__link {
            color: var(--green);
            font-size: .8rem;
            font-weight: 800;
        }

        .table-wrap {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            padding: 15px 22px;
            text-align: left;
            vertical-align: middle;
        }

        th {
            color: var(--muted);
            font-size: .7rem;
            font-weight: 850;
            letter-spacing: .08em;
            text-transform: uppercase;
        }

        td {
            border-top: 1px solid var(--line);
            font-size: .84rem;
        }

        .message-name {
            font-weight: 800;
        }

        .message-email,
        .message-date {
            color: var(--muted);
            font-size: .75rem;
        }

        .badge {
            display: inline-flex;
            min-height: 25px;
            align-items: center;
            border-radius: 999px;
            padding: 0 9px;
            color: var(--green);
            background: var(--green-soft);
            font-size: .7rem;
            font-weight: 850;
        }

        .activity {
            display: grid;
            gap: 0;
            padding: 4px 22px 12px;
        }

        .activity__item {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 12px;
            padding: 16px 0;
            border-bottom: 1px solid var(--line);
        }

        .activity__item:last-child {
            border-bottom: 0;
        }

        .activity__dot {
            width: 9px;
            margin-top: 5px;
            aspect-ratio: 1;
            border-radius: 50%;
            background: var(--terracotta);
            box-shadow: 0 0 0 5px rgba(200, 93, 61, .1);
        }

        .activity__item p {
            margin: 0;
            font-size: .82rem;
            line-height: 1.5;
        }

        .activity__item small {
            display: block;
            margin-top: 5px;
            color: var(--muted);
            font-size: .72rem;
        }

        .empty {
            padding: 30px 22px;
            color: var(--muted);
            text-align: center;
        }

        .mobile-menu {
            display: none;
        }

        @media (max-width: 1050px) {
            .stats {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 760px) {
            .admin-shell {
                grid-template-columns: 1fr;
            }

            .sidebar {
                position: fixed;
                z-index: 20;
                inset: 0 auto 0 0;
                width: min(280px, 86vw);
                transform: translateX(-100%);
                transition: transform .2s ease;
            }

            body.menu-open .sidebar {
                transform: translateX(0);
            }

            .main {
                padding: 20px 14px 36px;
            }

            .mobile-menu {
                display: inline-grid;
                width: 43px;
                aspect-ratio: 1;
                place-items: center;
                border: 1px solid var(--line);
                border-radius: 12px;
                background: white;
                cursor: pointer;
            }

            .topbar {
                align-items: flex-start;
            }

            .topbar__actions {
                display: none;
            }
        }

        @media (max-width: 520px) {
            .stats {
                grid-template-columns: 1fr;
            }

            th:nth-child(2),
            td:nth-child(2) {
                display: none;
            }
        }
    </style>
</head>

<body>
<div class="admin-shell">
    <aside class="sidebar" id="admin-sidebar">
        <a class="brand" href="<?= e(relative_url('admin/')) ?>">
            <span class="brand__mark">EB</span>
            <span><?= e(APP_NAME) ?></span>
        </a>

        <nav class="nav" aria-label="Administración">
            <span class="nav__label">Principal</span>

            <a
                class="nav__link nav__link--active"
                href="<?= e(relative_url('admin/')) ?>"
            >
                <span class="nav__icon">⌂</span>
                Resumen
            </a>

            <a
                class="nav__link"
                href="<?= e(relative_url('admin/pages.php')) ?>"
            >
                <span class="nav__icon">▤</span>
                Páginas
            </a>

            <a
                class="nav__link"
                href="<?= e(relative_url('admin/content.php')) ?>"
            >
                <span class="nav__icon">✦</span>
                Contenido
            </a>

            <a
                class="nav__link"
                href="<?= e(relative_url('admin/media.php')) ?>"
            >
                <span class="nav__icon">▧</span>
                Multimedia
            </a>

            <span class="nav__label">Comunidad</span>

            <a
                class="nav__link"
                href="<?= e(relative_url('admin/messages.php')) ?>"
            >
                <span class="nav__icon">✉</span>
                Mensajes
            </a>

            <a
                class="nav__link"
                href="<?= e(relative_url('admin/subscribers.php')) ?>"
            >
                <span class="nav__icon">◎</span>
                Suscriptores
            </a>

            <span class="nav__label">Sistema</span>

            <a
                class="nav__link"
                href="<?= e(relative_url('admin/settings.php')) ?>"
            >
                <span class="nav__icon">⚙</span>
                Configuración
            </a>

            <a
                class="nav__link"
                href="<?= e(relative_url('admin/logout.php')) ?>"
            >
                <span class="nav__icon">↪</span>
                Cerrar sesión
            </a>
        </nav>

        <div class="sidebar__footer">
            <div class="user-card">
                <span class="user-card__avatar">
                    <?= e(admin_initials((string) ($user['name'] ?? 'Admin'))) ?>
                </span>

                <span class="user-card__info">
                    <strong><?= e($user['name'] ?? 'Administrador') ?></strong>
                    <small><?= e($user['role'] ?? '') ?></small>
                </span>
            </div>
        </div>
    </aside>

    <main class="main">
        <header class="topbar">
            <div style="display:flex;gap:14px;align-items:flex-start">
                <button
                    class="mobile-menu"
                    type="button"
                    aria-label="Abrir menú"
                    aria-controls="admin-sidebar"
                    aria-expanded="false"
                    data-menu-toggle
                >
                    ☰
                </button>

                <div>
                    <h1>Hola, <?= e($user['name'] ?? 'Administrador') ?></h1>
                    <p>Este es el estado actual del sitio.</p>
                </div>
            </div>

            <div class="topbar__actions">
                <a
                    class="button"
                    href="<?= e(relative_url('')) ?>"
                    target="_blank"
                    rel="noopener"
                >
                    Ver sitio
                </a>

                <a
                    class="button button--primary"
                    href="<?= e(relative_url('admin/content.php')) ?>"
                >
                    Editar contenido
                </a>
            </div>
        </header>

        <?php if (isset($dashboardError)): ?>
            <div class="alert" role="alert">
                <?= e($dashboardError) ?>
            </div>
        <?php endif ?>

        <section class="stats" aria-label="Estadísticas">
            <article class="stat">
                <div class="stat__top">
                    <strong>Mensajes nuevos</strong>
                    <span class="stat__icon">✉</span>
                </div>
                <span class="stat__value"><?= e($stats['messages']) ?></span>
                <span class="stat__label">Pendientes de revisión</span>
            </article>

            <article class="stat">
                <div class="stat__top">
                    <strong>Suscriptores</strong>
                    <span class="stat__icon">◎</span>
                </div>
                <span class="stat__value"><?= e($stats['subscribers']) ?></span>
                <span class="stat__label">Contactos activos</span>
            </article>

            <article class="stat">
                <div class="stat__top">
                    <strong>Páginas publicadas</strong>
                    <span class="stat__icon">▤</span>
                </div>
                <span class="stat__value"><?= e($stats['pages']) ?></span>
                <span class="stat__label">Contenido visible</span>
            </article>

            <article class="stat">
                <div class="stat__top">
                    <strong>Archivos</strong>
                    <span class="stat__icon">▧</span>
                </div>
                <span class="stat__value"><?= e($stats['media']) ?></span>
                <span class="stat__label">Elementos multimedia</span>
            </article>
        </section>

        <div class="grid">
            <section class="panel">
                <header class="panel__header">
                    <h2>Mensajes recientes</h2>
                    <a
                        class="panel__link"
                        href="<?= e(relative_url('admin/messages.php')) ?>"
                    >
                        Ver todos
                    </a>
                </header>

                <?php if ($recentMessages === []): ?>
                    <div class="empty">Todavía no hay mensajes.</div>
                <?php else: ?>
                    <div class="table-wrap">
                        <table>
                            <thead>
                            <tr>
                                <th>Contacto</th>
                                <th>Asunto</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                            </tr>
                            </thead>
                            <tbody>
                            <?php foreach ($recentMessages as $message): ?>
                                <tr>
                                    <td>
                                        <span class="message-name">
                                            <?= e($message['name']) ?>
                                        </span>
                                        <span class="message-email">
                                            <?= e($message['email']) ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?= e($message['subject'] ?: 'Sin asunto') ?>
                                    </td>
                                    <td>
                                        <span class="badge">
                                            <?= e($message['status']) ?>
                                        </span>
                                    </td>
                                    <td class="message-date">
                                        <?= e(admin_datetime($message['created_at'])) ?>
                                    </td>
                                </tr>
                            <?php endforeach ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif ?>
            </section>

            <section class="panel">
                <header class="panel__header">
                    <h2>Actividad reciente</h2>
                </header>

                <?php if ($recentActivity === []): ?>
                    <div class="empty">Todavía no hay actividad registrada.</div>
                <?php else: ?>
                    <div class="activity">
                        <?php foreach ($recentActivity as $activity): ?>
                            <article class="activity__item">
                                <span class="activity__dot"></span>
                                <div>
                                    <p>
                                        <strong>
                                            <?= e($activity['user_name'] ?: 'Sistema') ?>
                                        </strong>
                                        <?= e(
                                            $activity['description']
                                            ?: $activity['action']
                                        ) ?>
                                    </p>
                                    <small>
                                        <?= e(
                                            admin_datetime(
                                                $activity['created_at']
                                            )
                                        ) ?>
                                    </small>
                                </div>
                            </article>
                        <?php endforeach ?>
                    </div>
                <?php endif ?>
            </section>
        </div>
    </main>
</div>

<script>
(() => {
    'use strict';

    const button = document.querySelector('[data-menu-toggle]');

    if (!(button instanceof HTMLButtonElement)) {
        return;
    }

    const close = () => {
        document.body.classList.remove('menu-open');
        button.setAttribute('aria-expanded', 'false');
    };

    button.addEventListener('click', () => {
        const opened = document.body.classList.toggle('menu-open');
        button.setAttribute('aria-expanded', String(opened));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            close();
        }
    });

    document.addEventListener('click', (event) => {
        if (
            !document.body.classList.contains('menu-open')
            || !(event.target instanceof Node)
        ) {
            return;
        }

        const sidebar = document.querySelector('#admin-sidebar');

        if (
            sidebar instanceof HTMLElement
            && !sidebar.contains(event.target)
            && !button.contains(event.target)
        ) {
            close();
        }
    });
})();
</script>
</body>
</html>
