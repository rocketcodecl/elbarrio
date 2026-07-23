<?php

declare(strict_types=1);

/**
 * El Barrio Landing
 * Pie global del sitio público.
 *
 * Este archivo cierra <main>, .site-shell, <body> y <html>,
 * abiertos previamente en ./includes/header.php.
 */

if (!defined('EL_BARRIO_BOOTSTRAP_LOADED')) {
    require_once __DIR__ . '/bootstrap.php';
}

$site = isset($site) && is_array($site) ? $site : [];
$page = isset($page) && is_string($page) ? $page : 'home';

$siteName = (string) ($site['name'] ?? APP_NAME);
$currentYear = (int) date('Y');

$footerNavigation = [
    [
        'label' => 'Inicio',
        'path' => '',
    ],
    [
        'label' => 'Vecinos',
        'path' => 'vecinos',
    ],
    [
        'label' => 'Comercios',
        'path' => 'comercios',
    ],
    [
        'label' => 'Comunidades',
        'path' => 'comunidades',
    ],
    [
        'label' => 'Nosotros',
        'path' => 'nosotros',
    ],
];

$legalNavigation = [
    [
        'label' => 'Ayuda',
        'path' => 'ayuda',
    ],
    [
        'label' => 'Privacidad',
        'path' => 'privacidad',
    ],
    [
        'label' => 'Términos',
        'path' => 'terminos',
    ],
];
?>
        </main>

        <footer class="site-footer" aria-labelledby="footer-title">
            <div class="site-footer__glow" aria-hidden="true"></div>

            <div class="container site-footer__inner">
                <section class="site-footer__intro">
                    <a
                        class="brand brand--footer"
                        href="<?= e(relative_url()) ?>"
                        aria-label="<?= e($siteName) ?>, ir al inicio"
                    >
                        <span class="brand__mark" aria-hidden="true">
                            <svg
                                viewBox="0 0 48 48"
                                role="img"
                                focusable="false"
                            >
                                <path
                                    d="M7 22.5 24 8l17 14.5v17A2.5 2.5 0 0 1 38.5 42h-29A2.5 2.5 0 0 1 7 39.5v-17Z"
                                    fill="currentColor"
                                    opacity=".16"
                                />
                                <path
                                    d="M13 23.5 24 14l11 9.5V36H13V23.5Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M20 36v-8h8v8"
                                    fill="none"
                                    stroke="white"
                                    stroke-width="2.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </span>

                        <span class="brand__text"><?= e($siteName) ?></span>
                    </a>

                    <h2 class="site-footer__title" id="footer-title">
                        La vida del barrio, más cerca.
                    </h2>

                    <p class="site-footer__description">
                        Una plataforma para descubrir, conectar y fortalecer
                        todo lo que ocurre cerca de ti.
                    </p>

                    <a
                        class="button button--primary site-footer__button"
                        href="<?= e(relative_url('ayuda')) ?>"
                    >
                        Conoce El Barrio
                    </a>
                </section>

                <div class="site-footer__navigation">
                    <nav
                        class="site-footer__column"
                        aria-label="Enlaces del sitio"
                    >
                        <h3 class="site-footer__heading">Explora</h3>

                        <ul class="site-footer__links">
                            <?php foreach ($footerNavigation as $item): ?>
                                <li>
                                    <a
                                        href="<?= e(relative_url($item['path'])) ?>"
                                    >
                                        <?= e($item['label']) ?>
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </nav>

                    <nav
                        class="site-footer__column"
                        aria-label="Información y soporte"
                    >
                        <h3 class="site-footer__heading">Información</h3>

                        <ul class="site-footer__links">
                            <?php foreach ($legalNavigation as $item): ?>
                                <li>
                                    <a
                                        href="<?= e(relative_url($item['path'])) ?>"
                                    >
                                        <?= e($item['label']) ?>
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </nav>

                    <section class="site-footer__column">
                        <h3 class="site-footer__heading">Comunidad</h3>

                        <p class="site-footer__small-text">
                            Construido para vecinos, emprendedores,
                            organizaciones y comercios locales.
                        </p>

                        <a
                            class="site-footer__contact"
                            href="mailto:hola@elbarrio.lat"
                        >
                            hola@elbarrio.lat
                        </a>
                    </section>
                </div>
            </div>

            <div class="container site-footer__bottom">
                <p class="site-footer__copyright">
                    &copy; <?= e($currentYear) ?> <?= e($siteName) ?>.
                    Todos los derechos reservados.
                </p>

                <a class="site-footer__back-to-top" href="#inicio">
                    Volver arriba
                    <span aria-hidden="true">↑</span>
                </a>
            </div>
        </footer>
    </div>

    <script
        src="<?= e(asset_url('js/app.js')) ?>"
        defer
    ></script>
</body>
</html>
