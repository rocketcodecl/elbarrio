/**
 * El Barrio Landing
 * Motor de interacción del sitio público.
 *
 * Sin dependencias externas.
 */

(() => {
    'use strict';

    const documentElement = document.documentElement;
    const body = document.body;

    const reducedMotionQuery = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    );

    let prefersReducedMotion = reducedMotionQuery.matches;

    /**
     * Ejecuta una función cuando el DOM esté disponible.
     *
     * @param {() => void} callback
     */
    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, {
                once: true,
            });

            return;
        }

        callback();
    }

    /**
     * Limita un número entre dos valores.
     *
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Solicitud de animación agrupada.
     *
     * Evita ejecutar varias actualizaciones visuales durante el mismo frame.
     *
     * @param {(time: number) => void} callback
     * @returns {() => void}
     */
    function createFrameScheduler(callback) {
        let frameId = 0;

        return () => {
            if (frameId !== 0) {
                return;
            }

            frameId = window.requestAnimationFrame((time) => {
                frameId = 0;
                callback(time);
            });
        };
    }

    /**
     * Devuelve el alto de la cabecera fija.
     *
     * @returns {number}
     */
    function getHeaderHeight() {
        const header = document.querySelector('[data-site-header]');

        return header instanceof HTMLElement
            ? header.getBoundingClientRect().height
            : 0;
    }

    /**
     * Comprueba si un enlace apunta a una sección de la página actual.
     *
     * @param {HTMLAnchorElement} link
     * @returns {boolean}
     */
    function isSamePageAnchor(link) {
        const href = link.getAttribute('href');

        if (!href || !href.includes('#')) {
            return false;
        }

        try {
            const url = new URL(link.href, window.location.href);

            return (
                url.origin === window.location.origin
                && url.pathname === window.location.pathname
                && Boolean(url.hash)
            );
        } catch {
            return false;
        }
    }

    /**
     * Cierra el menú móvil.
     *
     * @param {HTMLElement|null} header
     * @param {HTMLButtonElement|null} toggle
     * @param {HTMLElement|null} navigation
     * @param {boolean} restoreFocus
     */
    function closeMobileMenu(
        header,
        toggle,
        navigation,
        restoreFocus = false
    ) {
        if (!toggle || !navigation) {
            return;
        }

        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menú');
        navigation.classList.remove('is-open');
        header?.classList.remove('is-menu-open');
        body.classList.remove('menu-open');

        if (restoreFocus) {
            toggle.focus();
        }
    }

    /**
     * Inicializa la cabecera fija y el menú móvil.
     */
    function initHeader() {
        const header = document.querySelector('[data-site-header]');
        const toggle = document.querySelector('[data-menu-toggle]');
        const navigation = document.querySelector('[data-site-navigation]');

        if (!(header instanceof HTMLElement)) {
            return;
        }

        const updateHeader = () => {
            header.classList.toggle('is-scrolled', window.scrollY > 20);
        };

        const scheduleHeaderUpdate = createFrameScheduler(updateHeader);

        updateHeader();

        window.addEventListener('scroll', scheduleHeaderUpdate, {
            passive: true,
        });

        if (
            !(toggle instanceof HTMLButtonElement)
            || !(navigation instanceof HTMLElement)
        ) {
            return;
        }

        toggle.addEventListener('click', () => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';

            toggle.setAttribute('aria-expanded', String(!isOpen));
            toggle.setAttribute(
                'aria-label',
                isOpen ? 'Abrir menú' : 'Cerrar menú'
            );

            navigation.classList.toggle('is-open', !isOpen);
            header.classList.toggle('is-menu-open', !isOpen);
            body.classList.toggle('menu-open', !isOpen);
        });

        navigation.addEventListener('click', (event) => {
            const target = event.target;

            if (target instanceof HTMLAnchorElement) {
                closeMobileMenu(header, toggle, navigation);
            }
        });

        document.addEventListener('click', (event) => {
            if (
                toggle.getAttribute('aria-expanded') !== 'true'
                || !(event.target instanceof Node)
            ) {
                return;
            }

            if (
                !navigation.contains(event.target)
                && !toggle.contains(event.target)
            ) {
                closeMobileMenu(header, toggle, navigation);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (
                event.key === 'Escape'
                && toggle.getAttribute('aria-expanded') === 'true'
            ) {
                closeMobileMenu(
                    header,
                    toggle,
                    navigation,
                    true
                );
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 1088) {
                closeMobileMenu(header, toggle, navigation);
            }
        });
    }

    /**
     * Inicializa el desplazamiento suave para enlaces internos.
     */
    function initSmoothScroll() {
        document.addEventListener('click', (event) => {
            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const link = target.closest('a');

            if (
                !(link instanceof HTMLAnchorElement)
                || !isSamePageAnchor(link)
            ) {
                return;
            }

            const hash = new URL(
                link.href,
                window.location.href
            ).hash;

            let destination;

            try {
                destination = document.querySelector(hash);
            } catch {
                return;
            }

            if (!(destination instanceof HTMLElement)) {
                return;
            }

            event.preventDefault();

            const offset = getHeaderHeight() + 16;
            const top = Math.max(
                0,
                destination.getBoundingClientRect().top
                + window.scrollY
                - offset
            );

            window.scrollTo({
                top,
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
            });

            if (history.pushState) {
                history.pushState(null, '', hash);
            }

            window.setTimeout(() => {
                destination.focus({
                    preventScroll: true,
                });
            }, prefersReducedMotion ? 0 : 500);
        });
    }

    /**
     * Muestra elementos cuando entran en pantalla.
     */
    function initRevealAnimations() {
        const elements = Array.from(
            document.querySelectorAll('[data-reveal]')
        );

        if (elements.length === 0) {
            return;
        }

        if (
            prefersReducedMotion
            || !('IntersectionObserver' in window)
        ) {
            elements.forEach((element) => {
                element.classList.add('is-visible');
            });

            return;
        }

        const observer = new IntersectionObserver(
            (entries, currentObserver) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    const element = entry.target;
                    const delay = Number(
                        element.getAttribute('data-reveal-delay') ?? 0
                    );

                    window.setTimeout(() => {
                        element.classList.add('is-visible');
                    }, Math.max(0, delay));

                    currentObserver.unobserve(element);
                });
            },
            {
                rootMargin: '0px 0px -10% 0px',
                threshold: 0.12,
            }
        );

        elements.forEach((element, index) => {
            if (!element.hasAttribute('data-reveal-delay')) {
                element.style.transitionDelay = `${Math.min(
                    (index % 4) * 80,
                    240
                )}ms`;
            }

            observer.observe(element);
        });
    }

    /**
     * Añade movimiento sutil al escenario principal.
     */
    function initHeroScene() {
        const hero = document.querySelector('[data-hero]');
        const scene = document.querySelector(
            '[data-neighborhood-scene]'
        );

        if (
            !(hero instanceof HTMLElement)
            || !(scene instanceof HTMLElement)
            || prefersReducedMotion
        ) {
            return;
        }

        let pointerX = 0;
        let pointerY = 0;
        let currentX = 0;
        let currentY = 0;
        let animationFrame = 0;
        let heroVisible = true;

        const floatingCards = Array.from(
            scene.querySelectorAll('[data-float]')
        );

        const speedMap = {
            slow: 0.45,
            medium: 0.75,
            fast: 1,
        };

        const animate = () => {
            currentX += (pointerX - currentX) * 0.07;
            currentY += (pointerY - currentY) * 0.07;

            scene.style.setProperty(
                '--scene-rotate-x',
                `${currentY * -3.5}deg`
            );

            scene.style.setProperty(
                '--scene-rotate-y',
                `${currentX * 4.5}deg`
            );

            floatingCards.forEach((card, index) => {
                if (!(card instanceof HTMLElement)) {
                    return;
                }

                const key = card.getAttribute('data-float') ?? 'medium';
                const speed = speedMap[key] ?? 0.75;
                const direction = index % 2 === 0 ? 1 : -1;

                card.style.setProperty(
                    '--float-x',
                    `${currentX * 12 * speed * direction}px`
                );

                card.style.setProperty(
                    '--float-y',
                    `${currentY * 10 * speed}px`
                );
            });

            if (
                heroVisible
                && (
                    Math.abs(pointerX - currentX) > 0.001
                    || Math.abs(pointerY - currentY) > 0.001
                )
            ) {
                animationFrame = window.requestAnimationFrame(animate);
            } else {
                animationFrame = 0;
            }
        };

        const scheduleAnimation = () => {
            if (animationFrame === 0 && heroVisible) {
                animationFrame = window.requestAnimationFrame(animate);
            }
        };

        hero.addEventListener('pointermove', (event) => {
            const bounds = hero.getBoundingClientRect();

            pointerX = clamp(
                (event.clientX - bounds.left) / bounds.width * 2 - 1,
                -1,
                1
            );

            pointerY = clamp(
                (event.clientY - bounds.top) / bounds.height * 2 - 1,
                -1,
                1
            );

            scheduleAnimation();
        });

        hero.addEventListener('pointerleave', () => {
            pointerX = 0;
            pointerY = 0;
            scheduleAnimation();
        });

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    heroVisible = Boolean(entry?.isIntersecting);

                    if (heroVisible) {
                        scheduleAnimation();
                    }
                },
                {
                    threshold: 0,
                }
            );

            observer.observe(hero);
        }
    }

    /**
     * Parallax moderado para fondos y elementos decorativos.
     */
    function initParallax() {
        const hero = document.querySelector('[data-hero]');

        if (
            !(hero instanceof HTMLElement)
            || prefersReducedMotion
        ) {
            return;
        }

        const ambient = hero.querySelector('.hero__ambient');
        const scene = hero.querySelector('[data-neighborhood-scene]');

        const update = () => {
            const bounds = hero.getBoundingClientRect();
            const progress = clamp(
                -bounds.top / Math.max(bounds.height, 1),
                0,
                1
            );

            if (ambient instanceof HTMLElement) {
                ambient.style.transform = `translate3d(0, ${
                    progress * 60
                }px, 0)`;
            }

            if (scene instanceof HTMLElement) {
                scene.style.setProperty(
                    '--scene-scroll-y',
                    `${progress * 42}px`
                );
            }
        };

        const scheduleUpdate = createFrameScheduler(update);

        update();

        window.addEventListener('scroll', scheduleUpdate, {
            passive: true,
        });

        window.addEventListener('resize', scheduleUpdate);
    }

    /**
     * Activa el estado visual de las tarjetas del relato.
     */
    function initScrollStories() {
        const stories = document.querySelectorAll(
            '[data-scroll-story]'
        );

        if (stories.length === 0) {
            return;
        }

        stories.forEach((story) => {
            const cards = Array.from(
                story.querySelectorAll('.problem-card')
            );

            if (
                prefersReducedMotion
                || !('IntersectionObserver' in window)
            ) {
                cards.forEach((card) => {
                    card.classList.add('is-active');
                });

                return;
            }

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        entry.target.classList.toggle(
                            'is-active',
                            entry.isIntersecting
                        );
                    });
                },
                {
                    rootMargin: '-20% 0px -35% 0px',
                    threshold: 0.35,
                }
            );

            cards.forEach((card) => {
                observer.observe(card);
            });
        });
    }

    /**
     * Da movimiento al ecosistema de nodos.
     */
    function initOrbit() {
        const orbit = document.querySelector('[data-orbit]');

        if (
            !(orbit instanceof HTMLElement)
            || prefersReducedMotion
        ) {
            return;
        }

        const nodes = Array.from(
            orbit.querySelectorAll('.platform-node')
        );

        if (nodes.length === 0) {
            return;
        }

        let active = false;
        let frameId = 0;
        let startTime = performance.now();

        const animate = (time) => {
            if (!active) {
                frameId = 0;
                return;
            }

            const elapsed = (time - startTime) / 1000;

            nodes.forEach((node, index) => {
                if (!(node instanceof HTMLElement)) {
                    return;
                }

                const offset = Math.sin(
                    elapsed * 0.9 + index * 1.25
                ) * 5;

                node.style.setProperty(
                    '--orbit-offset',
                    `${offset}px`
                );
            });

            frameId = window.requestAnimationFrame(animate);
        };

        const start = () => {
            if (frameId !== 0 || !active) {
                return;
            }

            startTime = performance.now();
            frameId = window.requestAnimationFrame(animate);
        };

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    active = Boolean(entry?.isIntersecting);

                    if (active) {
                        start();
                    }
                },
                {
                    rootMargin: '15% 0px',
                    threshold: 0,
                }
            );

            observer.observe(orbit);
        } else {
            active = true;
            start();
        }
    }

    /**
     * Anima valores numéricos visibles.
     */
    function initCounters() {
        const counters = Array.from(
            document.querySelectorAll(
                '[data-counter], .impact-stat__value'
            )
        );

        if (counters.length === 0) {
            return;
        }

        counters.forEach((counter) => {
            if (!(counter instanceof HTMLElement)) {
                return;
            }

            const explicitTarget = counter.getAttribute('data-counter');
            const rawText = counter.textContent?.trim() ?? '';
            const match = rawText.match(/-?\d+(?:[.,]\d+)?/);
            const parsedTarget = Number(
                (explicitTarget ?? match?.[0] ?? '0').replace(',', '.')
            );

            if (!Number.isFinite(parsedTarget)) {
                return;
            }

            const prefix = counter.getAttribute('data-prefix') ?? '';
            const suffix = counter.getAttribute('data-suffix')
                ?? rawText.replace(match?.[0] ?? '', '');

            counter.dataset.counterTarget = String(parsedTarget);
            counter.dataset.counterPrefix = prefix;
            counter.dataset.counterSuffix = suffix;
            counter.textContent = `${prefix}0${suffix}`;
        });

        const animateCounter = (element) => {
            const target = Number(element.dataset.counterTarget ?? 0);
            const prefix = element.dataset.counterPrefix ?? '';
            const suffix = element.dataset.counterSuffix ?? '';
            const duration = 1100;
            const start = performance.now();

            const formatValue = (value) => {
                const hasDecimals = !Number.isInteger(target);

                return value.toLocaleString('es-CL', {
                    maximumFractionDigits: hasDecimals ? 1 : 0,
                });
            };

            const tick = (time) => {
                const progress = clamp(
                    (time - start) / duration,
                    0,
                    1
                );

                const eased = 1 - Math.pow(1 - progress, 3);
                const current = target * eased;

                element.textContent = `${prefix}${
                    formatValue(current)
                }${suffix}`;

                if (progress < 1) {
                    window.requestAnimationFrame(tick);
                }
            };

            window.requestAnimationFrame(tick);
        };

        if (
            prefersReducedMotion
            || !('IntersectionObserver' in window)
        ) {
            counters.forEach((counter) => {
                if (!(counter instanceof HTMLElement)) {
                    return;
                }

                const target = Number(counter.dataset.counterTarget ?? 0);
                const prefix = counter.dataset.counterPrefix ?? '';
                const suffix = counter.dataset.counterSuffix ?? '';

                counter.textContent = `${prefix}${target}${suffix}`;
            });

            return;
        }

        const observer = new IntersectionObserver(
            (entries, currentObserver) => {
                entries.forEach((entry) => {
                    if (
                        !entry.isIntersecting
                        || !(entry.target instanceof HTMLElement)
                    ) {
                        return;
                    }

                    animateCounter(entry.target);
                    currentObserver.unobserve(entry.target);
                });
            },
            {
                threshold: 0.5,
            }
        );

        counters.forEach((counter) => {
            observer.observe(counter);
        });
    }

    /**
     * Marca la sección visible en los enlaces internos.
     */
    function initSectionTracking() {
        if (!('IntersectionObserver' in window)) {
            return;
        }

        const internalLinks = Array.from(
            document.querySelectorAll('a[href^="#"]')
        ).filter((link) => link instanceof HTMLAnchorElement);

        const targets = internalLinks
            .map((link) => {
                const href = link.getAttribute('href');

                if (!href || href === '#') {
                    return null;
                }

                try {
                    return document.querySelector(href);
                } catch {
                    return null;
                }
            })
            .filter((target) => target instanceof HTMLElement);

        if (targets.length === 0) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort(
                        (first, second) =>
                            second.intersectionRatio
                            - first.intersectionRatio
                    );

                const active = visible[0]?.target;

                if (!(active instanceof HTMLElement)) {
                    return;
                }

                internalLinks.forEach((link) => {
                    const href = link.getAttribute('href');
                    const isActive = href === `#${active.id}`;

                    link.classList.toggle(
                        'is-section-active',
                        isActive
                    );
                });
            },
            {
                rootMargin: '-30% 0px -60% 0px',
                threshold: [0.05, 0.25, 0.5],
            }
        );

        targets.forEach((target) => {
            observer.observe(target);
        });
    }

    /**
     * Carga diferida para imágenes que no tengan configuración nativa.
     */
    function initLazyImages() {
        const images = document.querySelectorAll('img:not([loading])');

        images.forEach((image, index) => {
            image.loading = index === 0 ? 'eager' : 'lazy';
            image.decoding = 'async';
        });
    }

    /**
     * Añade efectos de profundidad mediante inclinación sutil.
     */
    function initCardTilt() {
        if (
            prefersReducedMotion
            || !window.matchMedia('(pointer: fine)').matches
        ) {
            return;
        }

        const cards = document.querySelectorAll(
            '.listing-card, .problem-card'
        );

        cards.forEach((card) => {
            if (!(card instanceof HTMLElement)) {
                return;
            }

            card.addEventListener('pointermove', (event) => {
                const bounds = card.getBoundingClientRect();
                const x = clamp(
                    (event.clientX - bounds.left) / bounds.width,
                    0,
                    1
                );

                const y = clamp(
                    (event.clientY - bounds.top) / bounds.height,
                    0,
                    1
                );

                const rotateY = (x - 0.5) * 4;
                const rotateX = (0.5 - y) * 4;

                card.style.setProperty(
                    '--card-rotate-x',
                    `${rotateX}deg`
                );

                card.style.setProperty(
                    '--card-rotate-y',
                    `${rotateY}deg`
                );
            });

            card.addEventListener('pointerleave', () => {
                card.style.setProperty(
                    '--card-rotate-x',
                    '0deg'
                );

                card.style.setProperty(
                    '--card-rotate-y',
                    '0deg'
                );
            });
        });
    }

    /**
     * Mantiene coherencia cuando cambia la preferencia de movimiento.
     */
    function initMotionPreference() {
        const update = (event) => {
            prefersReducedMotion = event.matches;

            documentElement.classList.toggle(
                'reduced-motion',
                prefersReducedMotion
            );
        };

        documentElement.classList.toggle(
            'reduced-motion',
            prefersReducedMotion
        );

        if (typeof reducedMotionQuery.addEventListener === 'function') {
            reducedMotionQuery.addEventListener('change', update);
        } else if (
            typeof reducedMotionQuery.addListener === 'function'
        ) {
            reducedMotionQuery.addListener(update);
        }
    }

    /**
     * Registra errores inesperados sin interrumpir la página.
     */
    function initErrorBoundary() {
        window.addEventListener('error', (event) => {
            if (
                documentElement.dataset.environment === 'production'
            ) {
                return;
            }

            console.error(
                '[El Barrio] Error de frontend:',
                event.error ?? event.message
            );
        });

        window.addEventListener(
            'unhandledrejection',
            (event) => {
                if (
                    documentElement.dataset.environment === 'production'
                ) {
                    return;
                }

                console.error(
                    '[El Barrio] Promesa rechazada:',
                    event.reason
                );
            }
        );
    }

    /**
     * Arranque.
     */
    onReady(() => {
        initMotionPreference();
        initErrorBoundary();
        initHeader();
        initSmoothScroll();
        initRevealAnimations();
        initHeroScene();
        initParallax();
        initScrollStories();
        initOrbit();
        initCounters();
        initSectionTracking();
        initLazyImages();
        initCardTilt();

        documentElement.classList.add('app-ready');
    });
})();
