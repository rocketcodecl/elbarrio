<?php

declare(strict_types=1);

/**
 * El Barrio
 * Gestión de páginas del panel administrativo.
 */

require_once dirname(__DIR__) . '/includes/bootstrap.php';
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/auth.php';

require_installation();
auth_require_role(['administrator', 'editor']);

if (!headers_sent()) {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
}

$user = auth_user();
$errors = [];
$notice = '';
$editingPage = null;

$statusLabels = [
    'draft' => 'Borrador',
    'published' => 'Publicada',
    'archived' => 'Archivada',
];

/**
 * Lee un valor POST.
 */
function admin_page_input(string $key, string $default = ''): string
{
    $value = $_POST[$key] ?? $default;

    return is_string($value) ? trim($value) : $default;
}

/**
 * Genera un slug seguro y único.
 */
function admin_page_unique_slug(string $title, ?int $ignoreId = null): string
{
    $base = slugify($title);

    if ($base === '') {
        $base = 'pagina';
    }

    $slug = $base;
    $counter = 2;

    while (true) {
        $sql = 'SELECT id FROM pages WHERE slug = :slug';
        $params = ['slug' => $slug];

        if ($ignoreId !== null) {
            $sql .= ' AND id != :id';
            $params['id'] = $ignoreId;
        }

        $sql .= ' LIMIT 1';

        if (db_fetch_one($sql, $params) === null) {
            return $slug;
        }

        $slug = $base . '-' . $counter;
        $counter++;
    }
}

/**
 * Formatea una fecha.
 */
function admin_page_date(?string $value): string
{
    if ($value === null || $value === '') {
        return '—';
    }

    $timestamp = strtotime($value);

    return $timestamp === false
        ? $value
        : date('d/m/Y H:i', $timestamp);
}

if (
    strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'POST'
) {
    $csrfToken = admin_page_input('csrf_token');

    if (!auth_verify_csrf($csrfToken)) {
        $errors[] = 'La sesión del formulario expiró.';
    } else {
        $action = admin_page_input('action');

        try {
            if ($action === 'save') {
                $pageId = filter_input(INPUT_POST, 'page_id', FILTER_VALIDATE_INT);
                $pageId = $pageId !== false && $pageId !== null
                    ? (int) $pageId
                    : null;

                $title = admin_page_input('title');
                $slugInput = admin_page_input('slug');
                $excerpt = admin_page_input('excerpt');
                $contentValue = isset($_POST['content']) && is_string($_POST['content'])
                    ? trim($_POST['content'])
                    : '';
                $status = admin_page_input('status', 'draft');
                $metaTitle = admin_page_input('meta_title');
                $metaDescription = admin_page_input('meta_description');

                if (mb_strlen($title) < 3) {
                    $errors[] = 'El título debe tener al menos 3 caracteres.';
                }

                if (!array_key_exists($status, $statusLabels)) {
                    $errors[] = 'El estado seleccionado no es válido.';
                }

                if (mb_strlen($metaTitle) > 190) {
                    $errors[] = 'El título SEO no puede superar 190 caracteres.';
                }

                if (mb_strlen($metaDescription) > 320) {
                    $errors[] = 'La descripción SEO no puede superar 320 caracteres.';
                }

                if ($errors === []) {
                    $slugSource = $slugInput !== '' ? $slugInput : $title;
                    $slug = admin_page_unique_slug($slugSource, $pageId);
                    $publishedAt = $status === 'published'
                        ? date('Y-m-d H:i:s')
                        : null;

                    if ($pageId === null) {
                        db_execute(
                            'INSERT INTO pages
                                (
                                    title,
                                    slug,
                                    excerpt,
                                    content,
                                    template,
                                    status,
                                    meta_title,
                                    meta_description,
                                    published_at,
                                    created_by,
                                    updated_by,
                                    created_at,
                                    updated_at
                                )
                             VALUES
                                (
                                    :title,
                                    :slug,
                                    :excerpt,
                                    :content,
                                    :template,
                                    :status,
                                    :meta_title,
                                    :meta_description,
                                    :published_at,
                                    :created_by,
                                    :updated_by,
                                    NOW(),
                                    NOW()
                                )',
                            [
                                'title' => $title,
                                'slug' => $slug,
                                'excerpt' => $excerpt !== '' ? $excerpt : null,
                                'content' => $contentValue !== '' ? $contentValue : null,
                                'template' => 'default',
                                'status' => $status,
                                'meta_title' => $metaTitle !== '' ? $metaTitle : null,
                                'meta_description' => $metaDescription !== ''
                                    ? $metaDescription
                                    : null,
                                'published_at' => $publishedAt,
                                'created_by' => (int) $user['id'],
                                'updated_by' => (int) $user['id'],
                            ]
                        );

                        $newPage = db_fetch_one(
                            'SELECT id FROM pages WHERE slug = :slug LIMIT 1',
                            ['slug' => $slug]
                        );

                        auth_log_activity(
                            'create_page',
                            'page',
                            isset($newPage['id']) ? (int) $newPage['id'] : null,
                            'Creó la página "' . $title . '".'
                        );

                        $notice = 'La página fue creada correctamente.';
                    } else {
                        $existing = db_fetch_one(
                            'SELECT id, published_at
                             FROM pages
                             WHERE id = :id
                             LIMIT 1',
                            ['id' => $pageId]
                        );

                        if ($existing === null) {
                            throw new RuntimeException('La página no existe.');
                        }

                        if (
                            $status === 'published'
                            && !empty($existing['published_at'])
                        ) {
                            $publishedAt = $existing['published_at'];
                        }

                        db_execute(
                            'UPDATE pages
                             SET title = :title,
                                 slug = :slug,
                                 excerpt = :excerpt,
                                 content = :content,
                                 status = :status,
                                 meta_title = :meta_title,
                                 meta_description = :meta_description,
                                 published_at = :published_at,
                                 updated_by = :updated_by,
                                 updated_at = NOW()
                             WHERE id = :id',
                            [
                                'title' => $title,
                                'slug' => $slug,
                                'excerpt' => $excerpt !== '' ? $excerpt : null,
                                'content' => $contentValue !== '' ? $contentValue : null,
                                'status' => $status,
                                'meta_title' => $metaTitle !== '' ? $metaTitle : null,
                                'meta_description' => $metaDescription !== ''
                                    ? $metaDescription
                                    : null,
                                'published_at' => $publishedAt,
                                'updated_by' => (int) $user['id'],
                                'id' => $pageId,
                            ]
                        );

                        auth_log_activity(
                            'update_page',
                            'page',
                            $pageId,
                            'Actualizó la página "' . $title . '".'
                        );

                        $notice = 'Los cambios fueron guardados.';
                    }
                }
            }

            if ($action === 'delete') {
                auth_require_role(['administrator']);

                $pageId = filter_input(INPUT_POST, 'page_id', FILTER_VALIDATE_INT);

                if ($pageId === false || $pageId === null) {
                    throw new RuntimeException('La página seleccionada no es válida.');
                }

                $page = db_fetch_one(
                    'SELECT id, title FROM pages WHERE id = :id LIMIT 1',
                    ['id' => (int) $pageId]
                );

                if ($page === null) {
                    throw new RuntimeException('La página no existe.');
                }

                db_execute(
                    'DELETE FROM pages WHERE id = :id',
                    ['id' => (int) $pageId]
                );

                auth_log_activity(
                    'delete_page',
                    'page',
                    (int) $pageId,
                    'Eliminó la página "' . $page['title'] . '".'
                );

                $notice = 'La página fue eliminada.';
            }
        } catch (Throwable $exception) {
            $errors[] = APP_DEBUG
                ? $exception->getMessage()
                : 'No fue posible completar la operación.';
        }
    }
}

$editId = filter_input(INPUT_GET, 'edit', FILTER_VALIDATE_INT);

if ($editId !== false && $editId !== null) {
    $editingPage = db_fetch_one(
        'SELECT
            id,
            title,
            slug,
            excerpt,
            content,
            status,
            meta_title,
            meta_description
         FROM pages
         WHERE id = :id
         LIMIT 1',
        ['id' => (int) $editId]
    );
}

$search = isset($_GET['q']) && is_string($_GET['q'])
    ? trim($_GET['q'])
    : '';

$params = [];
$sql = 'SELECT
            pages.id,
            pages.title,
            pages.slug,
            pages.status,
            pages.published_at,
            pages.updated_at,
            users.name AS updated_by_name
        FROM pages
        LEFT JOIN users ON users.id = pages.updated_by';

if ($search !== '') {
    $sql .= ' WHERE pages.title LIKE :search OR pages.slug LIKE :search';
    $params['search'] = '%' . $search . '%';
}

$sql .= ' ORDER BY pages.updated_at DESC, pages.id DESC';

$pages = db_fetch_all($sql, $params);
$csrfToken = auth_csrf_token();

$form = [
    'id' => $editingPage['id'] ?? '',
    'title' => $editingPage['title'] ?? '',
    'slug' => $editingPage['slug'] ?? '',
    'excerpt' => $editingPage['excerpt'] ?? '',
    'content' => $editingPage['content'] ?? '',
    'status' => $editingPage['status'] ?? 'draft',
    'meta_title' => $editingPage['meta_title'] ?? '',
    'meta_description' => $editingPage['meta_description'] ?? '',
];
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="theme-color" content="#173d2e">

    <title>Páginas | <?= e(APP_NAME) ?></title>

    <style>
        :root {
            color-scheme: light;
            --ink: #17211c;
            --muted: #68736c;
            --paper: #f5f1e9;
            --surface: #fff;
            --line: #e1dace;
            --green: #245b45;
            --green-dark: #173d2e;
            --green-soft: #e8f0eb;
            --terracotta: #c85d3d;
            --danger: #a43b35;
            --shadow: 0 18px 50px rgba(23, 33, 28, .08);
        }

        * { box-sizing: border-box; }

        html {
            font-family: Inter, ui-sans-serif, system-ui, -apple-system,
                BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: var(--ink);
            background: var(--paper);
        }

        body { min-width: 320px; margin: 0; }
        a { color: inherit; text-decoration: none; }
        button, input, select, textarea { font: inherit; }

        .shell {
            display: grid;
            min-height: 100vh;
            grid-template-columns: 230px minmax(0, 1fr);
        }

        .sidebar {
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
        }

        .brand__mark {
            display: grid;
            width: 42px;
            aspect-ratio: 1;
            place-items: center;
            border-radius: 13px;
            background: rgba(255,255,255,.1);
        }

        .nav { display: grid; gap: 5px; }

        .nav a {
            min-height: 44px;
            display: flex;
            align-items: center;
            border-radius: 12px;
            padding: 0 12px;
            color: rgba(255,255,255,.7);
            font-weight: 700;
        }

        .nav a:hover,
        .nav a.active {
            color: white;
            background: rgba(255,255,255,.1);
        }

        .main { min-width: 0; padding: 30px; }

        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 24px;
        }

        h1 {
            margin: 0;
            font-size: clamp(2rem, 4vw, 2.8rem);
            letter-spacing: -.05em;
        }

        .topbar p { margin: 7px 0 0; color: var(--muted); }

        .layout {
            display: grid;
            grid-template-columns: minmax(0, 1.15fr) minmax(340px, .85fr);
            gap: 20px;
            align-items: start;
        }

        .panel {
            border: 1px solid var(--line);
            border-radius: 20px;
            background: var(--surface);
            box-shadow: var(--shadow);
        }

        .panel__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            border-bottom: 1px solid var(--line);
            padding: 18px 20px;
        }

        .panel__header h2 { margin: 0; font-size: 1rem; }

        .search {
            display: flex;
            gap: 8px;
        }

        input, select, textarea {
            width: 100%;
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 11px 13px;
            color: var(--ink);
            background: white;
            outline: none;
        }

        input:focus, select:focus, textarea:focus {
            border-color: var(--green);
            box-shadow: 0 0 0 4px rgba(36,91,69,.12);
        }

        textarea { min-height: 110px; resize: vertical; }
        textarea.content { min-height: 230px; }

        .button {
            display: inline-flex;
            min-height: 42px;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 0 16px;
            color: var(--ink);
            background: white;
            font-weight: 800;
            cursor: pointer;
        }

        .button--primary {
            border-color: var(--green);
            color: white;
            background: var(--green);
        }

        .button--danger {
            border-color: rgba(164,59,53,.25);
            color: var(--danger);
            background: rgba(164,59,53,.06);
        }

        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }

        th, td {
            padding: 14px 18px;
            text-align: left;
            border-top: 1px solid var(--line);
            vertical-align: middle;
        }

        th {
            border-top: 0;
            color: var(--muted);
            font-size: .7rem;
            text-transform: uppercase;
            letter-spacing: .08em;
        }

        td { font-size: .84rem; }
        .title { font-weight: 800; }
        .slug, .date { color: var(--muted); font-size: .75rem; }

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

        .row-actions {
            display: flex;
            gap: 7px;
            align-items: center;
        }

        .row-actions form { margin: 0; }

        .form {
            display: grid;
            gap: 17px;
            padding: 20px;
        }

        .field { display: grid; gap: 7px; }
        .field label { font-size: .82rem; font-weight: 800; }

        .form-actions {
            display: flex;
            gap: 10px;
            align-items: center;
            padding-top: 4px;
        }

        .alert {
            margin-bottom: 18px;
            border: 1px solid;
            border-radius: 14px;
            padding: 13px 15px;
        }

        .alert--error {
            border-color: rgba(164,59,53,.25);
            color: #762a26;
            background: rgba(164,59,53,.07);
        }

        .alert--success {
            border-color: rgba(36,91,69,.24);
            color: var(--green-dark);
            background: var(--green-soft);
        }

        .empty {
            padding: 34px 20px;
            color: var(--muted);
            text-align: center;
        }

        @media (max-width: 1050px) {
            .layout { grid-template-columns: 1fr; }
        }

        @media (max-width: 760px) {
            .shell { grid-template-columns: 1fr; }
            .sidebar { position: static; }
            .main { padding: 22px 14px 40px; }
            .topbar { align-items: flex-start; flex-direction: column; }
            .search { width: 100%; }
        }
    </style>
</head>

<body>
<div class="shell">
    <aside class="sidebar">
        <a class="brand" href="<?= e(relative_url('admin/')) ?>">
            <span class="brand__mark">EB</span>
            <span><?= e(APP_NAME) ?></span>
        </a>

        <nav class="nav">
            <a href="<?= e(relative_url('admin/')) ?>">Resumen</a>
            <a class="active" href="<?= e(relative_url('admin/pages.php')) ?>">Páginas</a>
            <a href="<?= e(relative_url('admin/content.php')) ?>">Contenido</a>
            <a href="<?= e(relative_url('admin/media.php')) ?>">Multimedia</a>
            <a href="<?= e(relative_url('admin/messages.php')) ?>">Mensajes</a>
            <a href="<?= e(relative_url('admin/subscribers.php')) ?>">Suscriptores</a>
            <a href="<?= e(relative_url('admin/settings.php')) ?>">Configuración</a>
            <a href="<?= e(relative_url('admin/logout.php')) ?>">Cerrar sesión</a>
        </nav>
    </aside>

    <main class="main">
        <header class="topbar">
            <div>
                <h1>Páginas</h1>
                <p>Crea y administra páginas informativas del sitio.</p>
            </div>

            <form class="search" method="get" action="">
                <input
                    name="q"
                    type="search"
                    value="<?= e($search) ?>"
                    placeholder="Buscar página"
                    aria-label="Buscar página"
                >
                <button class="button" type="submit">Buscar</button>
            </form>
        </header>

        <?php if ($errors !== []): ?>
            <div class="alert alert--error" role="alert">
                <?= e(implode(' ', $errors)) ?>
            </div>
        <?php endif ?>

        <?php if ($notice !== ''): ?>
            <div class="alert alert--success">
                <?= e($notice) ?>
            </div>
        <?php endif ?>

        <div class="layout">
            <section class="panel">
                <header class="panel__header">
                    <h2>Listado</h2>
                    <span><?= e(count($pages)) ?> página(s)</span>
                </header>

                <?php if ($pages === []): ?>
                    <div class="empty">No hay páginas registradas.</div>
                <?php else: ?>
                    <div class="table-wrap">
                        <table>
                            <thead>
                            <tr>
                                <th>Página</th>
                                <th>Estado</th>
                                <th>Actualización</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            <?php foreach ($pages as $page): ?>
                                <tr>
                                    <td>
                                        <div class="title"><?= e($page['title']) ?></div>
                                        <div class="slug">/<?= e($page['slug']) ?></div>
                                    </td>
                                    <td>
                                        <span class="badge">
                                            <?= e($statusLabels[$page['status']] ?? $page['status']) ?>
                                        </span>
                                    </td>
                                    <td>
                                        <div class="date">
                                            <?= e(admin_page_date($page['updated_at'])) ?>
                                        </div>
                                        <div class="date">
                                            <?= e($page['updated_by_name'] ?: 'Sistema') ?>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="row-actions">
                                            <a
                                                class="button"
                                                href="?edit=<?= e($page['id']) ?>"
                                            >
                                                Editar
                                            </a>

                                            <?php if (auth_has_role(['administrator'])): ?>
                                                <form
                                                    method="post"
                                                    action=""
                                                    onsubmit="return confirm('¿Eliminar esta página?');"
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="csrf_token"
                                                        value="<?= e($csrfToken) ?>"
                                                    >
                                                    <input
                                                        type="hidden"
                                                        name="action"
                                                        value="delete"
                                                    >
                                                    <input
                                                        type="hidden"
                                                        name="page_id"
                                                        value="<?= e($page['id']) ?>"
                                                    >
                                                    <button
                                                        class="button button--danger"
                                                        type="submit"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </form>
                                            <?php endif ?>
                                        </div>
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
                    <h2>
                        <?= $editingPage !== null ? 'Editar página' : 'Nueva página' ?>
                    </h2>

                    <?php if ($editingPage !== null): ?>
                        <a class="button" href="<?= e(relative_url('admin/pages.php')) ?>">
                            Cancelar
                        </a>
                    <?php endif ?>
                </header>

                <form class="form" method="post" action="">
                    <input
                        type="hidden"
                        name="csrf_token"
                        value="<?= e($csrfToken) ?>"
                    >
                    <input type="hidden" name="action" value="save">
                    <input
                        type="hidden"
                        name="page_id"
                        value="<?= e($form['id']) ?>"
                    >

                    <div class="field">
                        <label for="title">Título</label>
                        <input
                            id="title"
                            name="title"
                            type="text"
                            value="<?= e($form['title']) ?>"
                            maxlength="190"
                            required
                        >
                    </div>

                    <div class="field">
                        <label for="slug">Slug</label>
                        <input
                            id="slug"
                            name="slug"
                            type="text"
                            value="<?= e($form['slug']) ?>"
                            maxlength="190"
                            placeholder="Se genera automáticamente"
                        >
                    </div>

                    <div class="field">
                        <label for="excerpt">Resumen</label>
                        <textarea
                            id="excerpt"
                            name="excerpt"
                        ><?= e($form['excerpt']) ?></textarea>
                    </div>

                    <div class="field">
                        <label for="content">Contenido</label>
                        <textarea
                            class="content"
                            id="content"
                            name="content"
                        ><?= e($form['content']) ?></textarea>
                    </div>

                    <div class="field">
                        <label for="status">Estado</label>
                        <select id="status" name="status">
                            <?php foreach ($statusLabels as $value => $label): ?>
                                <option
                                    value="<?= e($value) ?>"
                                    <?= $form['status'] === $value ? 'selected' : '' ?>
                                >
                                    <?= e($label) ?>
                                </option>
                            <?php endforeach ?>
                        </select>
                    </div>

                    <div class="field">
                        <label for="meta_title">Título SEO</label>
                        <input
                            id="meta_title"
                            name="meta_title"
                            type="text"
                            value="<?= e($form['meta_title']) ?>"
                            maxlength="190"
                        >
                    </div>

                    <div class="field">
                        <label for="meta_description">Descripción SEO</label>
                        <textarea
                            id="meta_description"
                            name="meta_description"
                            maxlength="320"
                        ><?= e($form['meta_description']) ?></textarea>
                    </div>

                    <div class="form-actions">
                        <button class="button button--primary" type="submit">
                            Guardar página
                        </button>
                    </div>
                </form>
            </section>
        </div>
    </main>
</div>
</body>
</html>
