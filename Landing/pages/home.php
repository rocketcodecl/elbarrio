<?php

declare(strict_types=1);

/**
 * El Barrio Landing
 * Página principal pública.
 *
 * La estructura contiene únicamente contenido y hooks semánticos.
 * La presentación se definirá en ./assets/css/pages.css y las
 * interacciones en ./assets/js/app.js.
 */

if (!defined('EL_BARRIO_BOOTSTRAP_LOADED')) {
    require_once __DIR__ . '/../includes/bootstrap.php';
}

$experiences = [
    [
        'time' => '08:10',
        'eyebrow' => 'Empieza el día',
        'title' => 'Descubres lo que ocurre a pocas cuadras.',
        'description' => 'Avisos útiles, novedades y recomendaciones creadas por personas y comercios de tu zona.',
        'icon' => 'sun',
    ],
    [
        'time' => '12:40',
        'eyebrow' => 'Resuelves cerca',
        'title' => 'Encuentras ese servicio que necesitabas.',
        'description' => 'Profesionales, oficios y soluciones locales con contexto, cercanía y confianza comunitaria.',
        'icon' => 'tools',
    ],
    [
        'time' => '18:30',
        'eyebrow' => 'La comunidad se mueve',
        'title' => 'Te sumas a un plan que estaba al lado.',
        'description' => 'Ferias, talleres, encuentros, cultura y actividades que hacen visible la vida del barrio.',
        'icon' => 'calendar',
    ],
];

$marketplaceItems = [
    [
        'category' => 'Marketplace',
        'title' => 'Bicicleta urbana restaurada',
        'meta' => 'A 6 cuadras · Publicado hoy',
        'price' => '$95.000',
        'visual' => 'bike',
    ],
    [
        'category' => 'Comercio local',
        'title' => 'Pan de masa madre',
        'meta' => 'Horno del barrio · Retiro cercano',
        'price' => 'Desde $4.500',
        'visual' => 'bread',
    ],
    [
        'category' => 'Servicio',
        'title' => 'Reparaciones para el hogar',
        'meta' => 'Disponibilidad esta semana',
        'price' => 'Cotizar',
        'visual' => 'repair',
    ],
];

$impactStats = [
    ['value' => '1', 'suffix' => ' red', 'label' => 'para conectar la vida local'],
    ['value' => '5', 'suffix' => ' mundos', 'label' => 'vecinos, comercios, servicios, eventos y comunidad'],
    ['value' => '0', 'suffix' => ' distancia', 'label' => 'entre una necesidad y una oportunidad cercana'],
];
?>

<section class="hero section" aria-labelledby="hero-title" data-hero>
    <div class="hero__ambient" aria-hidden="true">
        <span class="hero__orb hero__orb--one"></span>
        <span class="hero__orb hero__orb--two"></span>
        <span class="hero__grid"></span>
    </div>

    <div class="container hero__layout">
        <div class="hero__content" data-reveal="up">
            <p class="eyebrow hero__eyebrow">
                Todo lo que importa, más cerca
            </p>

            <h1 class="hero__title" id="hero-title">
                Tu barrio ya está vivo.
                <span>Ahora también está conectado.</span>
            </h1>

            <p class="hero__description">
                Descubre personas, comercios, servicios, eventos y
                oportunidades reales alrededor de ti, en una sola comunidad.
            </p>

            <div class="hero__actions" aria-label="Acciones principales">
                <a class="button button--primary button--large" href="#descubre">
                    Descubre cómo funciona
                </a>

                <a class="button button--ghost button--large" href="#experiencia">
                    Ver la experiencia
                    <span aria-hidden="true">↓</span>
                </a>
            </div>

            <ul class="hero__proof" aria-label="Beneficios principales">
                <li>
                    <span aria-hidden="true">✓</span>
                    Información relevante
                </li>
                <li>
                    <span aria-hidden="true">✓</span>
                    Conexiones locales
                </li>
                <li>
                    <span aria-hidden="true">✓</span>
                    Comunidad real
                </li>
            </ul>
        </div>

        <div class="hero__scene" aria-label="Una representación animada de la vida del barrio" data-neighborhood-scene>
            <div class="neighborhood-card neighborhood-card--alert" data-float="slow">
                <span class="neighborhood-card__icon" aria-hidden="true">!</span>
                <div>
                    <strong>Dato útil</strong>
                    <span>Corte programado mañana</span>
                </div>
            </div>

            <div class="neighborhood-card neighborhood-card--event" data-float="medium">
                <span class="neighborhood-card__date" aria-hidden="true">SÁB<br>18</span>
                <div>
                    <strong>Feria local</strong>
                    <span>Plaza del barrio · 11:00</span>
                </div>
            </div>

            <div class="neighborhood-card neighborhood-card--commerce" data-float="fast">
                <span class="neighborhood-card__avatar" aria-hidden="true">CM</span>
                <div>
                    <strong>Café Mirador</strong>
                    <span>Nuevo menú de temporada</span>
                </div>
            </div>

            <div class="neighborhood-map" aria-hidden="true">
                <span class="neighborhood-map__street neighborhood-map__street--one"></span>
                <span class="neighborhood-map__street neighborhood-map__street--two"></span>
                <span class="neighborhood-map__street neighborhood-map__street--three"></span>
                <span class="neighborhood-map__block neighborhood-map__block--one"></span>
                <span class="neighborhood-map__block neighborhood-map__block--two"></span>
                <span class="neighborhood-map__block neighborhood-map__block--three"></span>
                <span class="neighborhood-map__block neighborhood-map__block--four"></span>
                <span class="neighborhood-map__pulse"></span>
                <span class="neighborhood-map__pin neighborhood-map__pin--one"></span>
                <span class="neighborhood-map__pin neighborhood-map__pin--two"></span>
                <span class="neighborhood-map__pin neighborhood-map__pin--three"></span>
            </div>
        </div>
    </div>

    <a class="hero__scroll" href="#descubre" aria-label="Continuar a la siguiente sección">
        <span>Explora</span>
        <span class="hero__scroll-line" aria-hidden="true"></span>
    </a>
</section>

<section class="problem section" id="descubre" aria-labelledby="problem-title">
    <div class="container problem__layout">
        <div class="section-heading problem__heading" data-reveal="up">
            <p class="eyebrow">La paradoja de vivir cerca</p>
            <h2 id="problem-title">
                Estamos rodeados de oportunidades que muchas veces no vemos.
            </h2>
        </div>

        <div class="problem__story" data-scroll-story>
            <article class="problem-card" data-reveal="up">
                <span class="problem-card__number">01</span>
                <h3>Lo necesitas</h3>
                <p>
                    Buscas una recomendación, un producto, un dato o alguien
                    que pueda ayudarte.
                </p>
            </article>

            <span class="problem__connector" aria-hidden="true"></span>

            <article class="problem-card" data-reveal="up">
                <span class="problem-card__number">02</span>
                <h3>Está muy cerca</h3>
                <p>
                    La respuesta existe a unas cuadras, en manos de una
                    persona, comercio u organización local.
                </p>
            </article>

            <span class="problem__connector" aria-hidden="true"></span>

            <article class="problem-card problem-card--accent" data-reveal="up">
                <span class="problem-card__number">03</span>
                <h3>El Barrio los conecta</h3>
                <p>
                    Reúne la información y transforma la cercanía geográfica
                    en una comunidad realmente útil.
                </p>
            </article>
        </div>
    </div>
</section>

<section class="platform section section--dark" aria-labelledby="platform-title">
    <div class="container">
        <div class="section-heading section-heading--center section-heading--light" data-reveal="up">
            <p class="eyebrow">Una infraestructura para la vida local</p>
            <h2 id="platform-title">Cinco mundos. Una sola experiencia.</h2>
            <p>
                El Barrio ordena lo que ocurre cerca y lo convierte en una
                red simple, humana y relevante.
            </p>
        </div>

        <div class="platform__orbit" data-orbit>
            <div class="platform__center">
                <span class="platform__logo" aria-hidden="true">EB</span>
                <strong>El Barrio</strong>
                <span>Todo cerca</span>
            </div>

            <article class="platform-node platform-node--neighbors">
                <span class="platform-node__icon" aria-hidden="true">●</span>
                <h3>Vecinos</h3>
                <p>Información, conversación y ayuda cotidiana.</p>
            </article>

            <article class="platform-node platform-node--commerce">
                <span class="platform-node__icon" aria-hidden="true">▦</span>
                <h3>Comercios</h3>
                <p>Visibilidad y relaciones con clientes cercanos.</p>
            </article>

            <article class="platform-node platform-node--services">
                <span class="platform-node__icon" aria-hidden="true">✦</span>
                <h3>Servicios</h3>
                <p>Talento local disponible cuando lo necesitas.</p>
            </article>

            <article class="platform-node platform-node--events">
                <span class="platform-node__icon" aria-hidden="true">□</span>
                <h3>Eventos</h3>
                <p>Planes y experiencias que ocurren alrededor.</p>
            </article>

            <article class="platform-node platform-node--community">
                <span class="platform-node__icon" aria-hidden="true">⌂</span>
                <h3>Comunidad</h3>
                <p>Participación, confianza e identidad compartida.</p>
            </article>
        </div>
    </div>
</section>

<section class="day section" id="experiencia" aria-labelledby="day-title">
    <div class="container day__layout">
        <div class="day__intro" data-reveal="up">
            <p class="eyebrow">Un día dentro de El Barrio</p>
            <h2 id="day-title">La tecnología desaparece. La vida local aparece.</h2>
            <p>
                Una experiencia diseñada para acompañar momentos reales,
                sin ruido innecesario ni contenido distante.
            </p>
        </div>

        <div class="day__timeline" data-timeline>
            <?php foreach ($experiences as $index => $experience): ?>
                <article class="timeline-card" data-reveal="up">
                    <div class="timeline-card__rail" aria-hidden="true">
                        <span class="timeline-card__dot"></span>
                        <?php if ($index < count($experiences) - 1): ?>
                            <span class="timeline-card__line"></span>
                        <?php endif; ?>
                    </div>

                    <div class="timeline-card__time">
                        <?= e($experience['time']) ?>
                    </div>

                    <div class="timeline-card__content">
                        <p class="timeline-card__eyebrow">
                            <?= e($experience['eyebrow']) ?>
                        </p>
                        <h3><?= e($experience['title']) ?></h3>
                        <p><?= e($experience['description']) ?></p>
                    </div>

                    <span
                        class="timeline-card__visual timeline-card__visual--<?= e($experience['icon']) ?>"
                        aria-hidden="true"
                    ></span>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="marketplace section section--soft" aria-labelledby="marketplace-title">
    <div class="container">
        <div class="section-heading marketplace__heading" data-reveal="up">
            <div>
                <p class="eyebrow">Economía de proximidad</p>
                <h2 id="marketplace-title">Comprar cerca cambia mucho más que una compra.</h2>
            </div>

            <p>
                Productos, servicios y comercios presentados con el contexto
                que realmente importa: quién está detrás y qué tan cerca está.
            </p>
        </div>

        <div class="marketplace__grid">
            <?php foreach ($marketplaceItems as $item): ?>
                <article class="listing-card" data-reveal="up">
                    <div
                        class="listing-card__visual listing-card__visual--<?= e($item['visual']) ?>"
                        aria-hidden="true"
                    >
                        <span></span>
                    </div>

                    <div class="listing-card__body">
                        <p class="listing-card__category">
                            <?= e($item['category']) ?>
                        </p>
                        <h3><?= e($item['title']) ?></h3>
                        <p class="listing-card__meta"><?= e($item['meta']) ?></p>

                        <div class="listing-card__footer">
                            <strong><?= e($item['price']) ?></strong>
                            <span aria-hidden="true">↗</span>
                        </div>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="trust section" aria-labelledby="trust-title">
    <div class="container trust__layout">
        <div class="trust__visual" data-reveal="left" aria-hidden="true">
            <div class="trust-ring trust-ring--outer"></div>
            <div class="trust-ring trust-ring--inner"></div>
            <div class="trust-avatar trust-avatar--one">AN</div>
            <div class="trust-avatar trust-avatar--two">LC</div>
            <div class="trust-avatar trust-avatar--three">MR</div>
            <div class="trust-avatar trust-avatar--four">JP</div>
            <div class="trust__center">
                <span>✓</span>
                <strong>Confianza local</strong>
            </div>
        </div>

        <div class="trust__content" data-reveal="right">
            <p class="eyebrow">Cercanía con contexto</p>
            <h2 id="trust-title">La confianza no se descarga. Se construye.</h2>
            <p>
                El Barrio prioriza relaciones comprensibles: perfiles claros,
                reputación, actividad local y participación comunitaria.
            </p>

            <ul class="feature-list">
                <li>
                    <span aria-hidden="true">01</span>
                    <div>
                        <strong>Identidad y contexto</strong>
                        <p>Sabes quién publica y cuál es su relación con la zona.</p>
                    </div>
                </li>
                <li>
                    <span aria-hidden="true">02</span>
                    <div>
                        <strong>Relevancia por proximidad</strong>
                        <p>Primero ves aquello que puede ser útil en tu entorno.</p>
                    </div>
                </li>
                <li>
                    <span aria-hidden="true">03</span>
                    <div>
                        <strong>Participación responsable</strong>
                        <p>Herramientas para cuidar la conversación y la comunidad.</p>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</section>

<section class="impact section section--accent" aria-labelledby="impact-title">
    <div class="container">
        <div class="section-heading section-heading--center" data-reveal="up">
            <p class="eyebrow">Impacto que empieza cerca</p>
            <h2 id="impact-title">Una plataforma digital con consecuencias reales.</h2>
        </div>

        <div class="impact__stats">
            <?php foreach ($impactStats as $stat): ?>
                <article class="impact-stat" data-reveal="up">
                    <p class="impact-stat__value">
                        <span data-counter="<?= e($stat['value']) ?>"><?= e($stat['value']) ?></span><?= e($stat['suffix']) ?>
                    </p>
                    <p><?= e($stat['label']) ?></p>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="manifesto section" aria-labelledby="manifesto-title">
    <div class="container manifesto__inner">
        <p class="eyebrow" data-reveal="up">Nuestro punto de partida</p>
        <h2 id="manifesto-title" data-reveal="up">
            Creemos que una ciudad se vuelve más humana cuando las personas
            pueden ver, valorar y activar lo que ya existe a su alrededor.
        </h2>
        <p class="manifesto__signature" data-reveal="up">
            Cerca no es solo una distancia. Es una forma de pertenecer.
        </p>
    </div>
</section>

<section class="final-cta section" aria-labelledby="final-cta-title">
    <div class="final-cta__background" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
    </div>

    <div class="container final-cta__inner" data-reveal="up">
        <p class="eyebrow">El Barrio está comenzando</p>
        <h2 id="final-cta-title">La próxima gran conexión puede estar a una cuadra.</h2>
        <p>
            Conoce una nueva forma de descubrir, participar y fortalecer la
            vida que ocurre alrededor de ti.
        </p>

        <div class="final-cta__actions">
            <a class="button button--light button--large" href="<?= e(relative_url('vecinos')) ?>">
                Soy vecino
            </a>
            <a class="button button--outline-light button--large" href="<?= e(relative_url('comercios')) ?>">
                Tengo un comercio
            </a>
        </div>
    </div>
</section>

<section class="section section--contact" id="contacto">
  <div class="container">
    <div class="section-heading">
      <p class="eyebrow">Hablemos</p>
      <h2>Construyamos un barrio más conectado.</h2>
      <p>Cuéntanos si eres vecino, comercio, organización o aliado.</p>
    </div>
    <form class="contact-form card" action="<?= e(relative_url('api/contact.php')) ?>" method="post" data-ajax-form>
      <input class="hp-field" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="form-grid">
        <label>Nombre<input name="name" required minlength="2"></label>
        <label>Correo<input name="email" type="email" required></label>
        <label>Teléfono<input name="phone"></label>
        <label>Asunto<input name="subject"></label>
        <label class="form-grid__wide">Mensaje<textarea name="message" required minlength="10" rows="6"></textarea></label>
      </div>
      <button class="button button--primary" type="submit">Enviar mensaje</button>
      <p class="form-status" role="status" data-form-status></p>
    </form>
  </div>
</section>
<script>
document.querySelectorAll('[data-ajax-form]').forEach(form=>form.addEventListener('submit',async e=>{
 e.preventDefault();const status=form.querySelector('[data-form-status]');const button=form.querySelector('button[type=submit]');
 button.disabled=true;status.textContent='Enviando…';
 try{const response=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}});const data=await response.json();status.textContent=data.message||'Listo.';if(data.ok)form.reset();}
 catch(error){status.textContent='No fue posible enviar. Intenta nuevamente.';}finally{button.disabled=false;}
}));
</script>
