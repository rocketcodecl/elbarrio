<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';
require_installation();

$page = isset($_GET['page']) && is_string($_GET['page']) ? slugify($_GET['page']) : 'home';
if ($page === '' || $page === 'inicio') $page = 'home';

if ($page === 'home') {
    require __DIR__ . '/pages/home.php';
    exit;
}

$row = db_fetch_one(
    "SELECT * FROM pages WHERE slug = :slug AND status = 'published' LIMIT 1",
    ['slug' => $page]
);
if (!$row) {
    http_response_code(404);
    $row = [
        'title' => 'Página no encontrada',
        'excerpt' => 'La dirección que buscas no existe o fue movida.',
        'content' => '<p>Vuelve al inicio para seguir explorando El Barrio.</p>',
        'meta_title' => 'Página no encontrada',
        'meta_description' => 'Página no encontrada.',
    ];
}
$site = ['name' => APP_NAME];
$title = $row['meta_title'] ?: $row['title'];
$description = $row['meta_description'] ?: ($row['excerpt'] ?: setting('site_description', 'El Barrio'));
require __DIR__ . '/includes/header.php';
?>
<section class="section page-article">
  <div class="container container--narrow">
    <p class="eyebrow">El Barrio</p>
    <h1><?= e($row['title']) ?></h1>
    <?php if (!empty($row['excerpt'])): ?><p class="lead"><?= e($row['excerpt']) ?></p><?php endif ?>
    <div class="prose"><?= $row['content'] ?></div>
  </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
