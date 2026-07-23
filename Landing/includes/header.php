<?php

declare(strict_types=1);

/**
 * El Barrio Landing
 * Cabecera global del sitio público.
 *
 * Variables esperadas:
 * - $site
 * - $page
 * - $meta
 * - $view
 */

if (!defined('EL_BARRIO_BOOTSTRAP_LOADED')) {
    require_once __DIR__ . '/bootstrap.php';
}

$site = isset($site) && is_array($site) ? $site : [];
$meta = isset($meta) && is_array($meta) ? $meta : [];
$view = isset($view) && is_array($view) ? $view : [];
$page = isset($page) && is_string($page) ? $page : 'home';

$siteName = (string) ($site['name'] ?? APP_NAME);
$pageTitle = (string) ($meta['title'] ?? $siteName);
$pageDescription = (string) ($meta['description'] ?? 'Todo tu barrio, en un solo lugar.');
$pageRobots = (string) ($meta['robots'] ?? 'index, follow');
$bodyClass = trim((string) ($view['body_class'] ?? 'page-' . $page));
$canonicalUrl = $page === 'home' ? app_url() : app_url($page);

$navigation = [
    'home' => ['label' => 'Inicio', 'path' => ''],
    'vecinos' => ['label' => 'Vecinos', 'path' => 'vecinos'],
    'comercios' => ['label' => 'Comercios', 'path' => 'comercios'],
    'comunidades' => ['label' => 'Comunidades', 'path' => 'comunidades'],
    'nosotros' => ['label' => 'Nosotros', 'path' => 'nosotros'],
];
?>
<!doctype html>
<html lang="es" class="no-js">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="light">
    <meta name="theme-color" content="#f4efe6">
    <meta name="robots" content="<?= e($pageRobots) ?>">
    <meta name="description" content="<?= e($pageDescription) ?>">

    <title><?= e($pageTitle) ?></title>

    <link rel="canonical" href="<?= e($canonicalUrl) ?>">
    <link rel="icon" href="<?= e(relative_url('favicon.svg')) ?>" type="image/svg+xml">
    <link rel="manifest" href="<?= e(relative_url('manifest.webmanifest')) ?>">

    <meta property="og:type" content="website">
    <meta property="og:locale" content="es_CL">
    <meta property="og:site_name" content="<?= e($siteName) ?>">
    <meta property="og:title" content="<?= e($pageTitle) ?>">
    <meta property="og:description" content="<?= e($pageDescription) ?>">
    <meta property="og:url" content="<?= e($canonicalUrl) ?>">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= e($pageTitle) ?>">
    <meta name="twitter:description" content="<?= e($pageDescription) ?>">

    <link rel="preload" href="<?= e(asset_url('css/base.css')) ?>" as="style">
    <link rel="stylesheet" href="<?= e(asset_url('css/base.css')) ?>">
    <link rel="stylesheet" href="<?= e(asset_url('css/components.css')) ?>">
    <link rel="stylesheet" href="<?= e(asset_url('css/pages.css')) ?>">

    <script>
        document.documentElement.classList.remove('no-js');
        document.documentElement.classList.add('js');
    </script>
</head>
<body class="<?= e($bodyClass) ?>" data-page="<?= e($page) ?>">
    <a class="skip-link" href="#contenido-principal">Saltar al contenido principal</a>

    <div class="site-shell" id="inicio">
        <header class="site-header" data-site-header>
            <div class="site-header__inner container">
                <a class="brand" href="<?= e(relative_url()) ?>" aria-label="<?= e($siteName) ?>, ir al inicio">
                    <span class="brand__mark" aria-hidden="true">
                        <svg viewBox="0 0 48 48" role="img" focusable="false">
                            <path d="M7 22.5 24 8l17 14.5v17A2.5 2.5 0 0 1 38.5 42h-29A2.5 2.5 0 0 1 7 39.5v-17Z" fill="currentColor" opacity=".16"/>
                            <path d="M13 23.5 24 14l11 9.5V36H13V23.5Z" fill="currentColor"/>
                            <path d="M20 36v-8h8v8" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <span class="brand__text"><?= e($siteName) ?></span>
                </a>

                <button
                    class="menu-toggle"
                    type="button"
                    aria-expanded="false"
                    aria-controls="site-navigation"
                    aria-label="Abrir menú"
                    data-menu-toggle
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <nav class="site-navigation" id="site-navigation" aria-label="Navegación principal" data-site-navigation>
                    <ul class="site-navigation__list">
                        <?php foreach ($navigation as $navigationPage => $item): ?>
                            <?php $isCurrent = $page === $navigationPage; ?>
                            <li class="site-navigation__item">
                                <a
                                    class="site-navigation__link<?= $isCurrent ? ' is-active' : '' ?>"
                                    href="<?= e(relative_url($item['path'])) ?>"
                                    <?= $isCurrent ? 'aria-current="page"' : '' ?>
                                >
                                    <?= e($item['label']) ?>
                                </a>
                            </li>
                        <?php endforeach; ?>
                    </ul>

                    <a class="button button--primary site-navigation__cta" href="<?= e(relative_url('ayuda')) ?>">
                        Conoce El Barrio
                    </a>
                </nav>
            </div>
        </header>

        <noscript>
            <div class="noscript-message" role="status">
                El sitio funciona sin JavaScript, pero algunas animaciones y controles interactivos estarán desactivados.
            </div>
        </noscript>

        <main id="contenido-principal" class="site-main" tabindex="-1">
