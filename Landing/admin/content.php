<?php

declare(strict_types=1);

/**
 * El Barrio
 * Gestor de secciones y elementos de contenido.
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

function content_post(string $key, string $default = ''): string
{
    $value = $_POST[$key] ?? $default;

    return is_string($value) ? trim($value) : $default;
}

function content_int(string $key): ?int
{
    $value = filter_input(INPUT_POST, $key, FILTER_VALIDATE_INT);

    return $value === false || $value === null ? null : (int) $value;
}

function content_bool(string $key): int
{
    return isset($_POST[$key]) ? 1 : 0;
}

function content_json_or_null(string $value, string $label, array &$errors): ?string
{
    if ($value === '') {
        return null;
    }

    json_decode($value, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        $errors[] = $label . ' debe contener JSON válido.';
        return null;
    }

    return $value;
}

function content_unique_key(string $source, ?int $ignoreId = null): string
{
    $base = slugify($source);
    $base = str_replace('-', '_', $base);

    if ($base === '') {
        $base = 'seccion';
    }

    $key = $base;
    $counter = 2;

    while (true) {
        $sql = 'SELECT id FROM content_sections WHERE section_key = :key';
        $params = ['key' => $key];

        if ($ignoreId !== null) {
            $sql .= ' AND id != :id';
            $params['id'] = $ignoreId;
        }

        $sql .= ' LIMIT 1';

        if (db_fetch_one($sql, $params) === null) {
            return $key;
        }

        $key = $base . '_' . $counter;
        $counter++;
    }
}

function content_media_url(array $media): string
{
    $directory = trim((string) ($media['directory'] ?? ''), '/');
    $filename = ltrim((string) ($media['filename'] ?? ''), '/');
    $path = trim($directory . '/' . $filename, '/');

    return relative_url('uploads/' . $path);
}

function content_upload_media(array &$errors, int $userId): ?int
{
    if (
        !isset($_FILES['media_file'])
        || !is_array($_FILES['media_file'])
        || (int) ($_FILES['media_file']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE
    ) {
        return null;
    }

    $file = $_FILES['media_file'];
    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($error !== UPLOAD_ERR_OK) {
        $errors[] = 'No fue posible subir la imagen seleccionada.';
        return null;
    }

    $size = (int) ($file['size'] ?? 0);

    if ($size < 1 || $size > 8 * 1024 * 1024) {
        $errors[] = 'La imagen debe pesar menos de 8 MB.';
        return null;
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    $originalName = (string) ($file['name'] ?? 'archivo');
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($tmpName);
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    if (!isset($allowed[$mime])) {
        $errors[] = 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.';
        return null;
    }

    $extension = $allowed[$mime];
    $directory = 'media/' . date('Y/m');
    $uploadRoot = dirname(__DIR__) . '/uploads/' . $directory;

    if (!is_dir($uploadRoot) && !mkdir($uploadRoot, 0755, true) && !is_dir($uploadRoot)) {
        $errors[] = 'No fue posible crear el directorio de subida.';
        return null;
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $destination = $uploadRoot . '/' . $filename;

    if (!move_uploaded_file($tmpName, $destination)) {
        $errors[] = 'No fue posible guardar la imagen.';
        return null;
    }

    $dimensions = @getimagesize($destination);
    $width = is_array($dimensions) ? (int) ($dimensions[0] ?? 0) : null;
    $height = is_array($dimensions) ? (int) ($dimensions[1] ?? 0) : null;
    $checksum = hash_file('sha256', $destination) ?: null;

    db_execute(
        'INSERT INTO media
            (disk, directory, filename, original_name, mime_type, extension,
             size_bytes, width, height, alt_text, checksum_sha256, uploaded_by,
             created_at, updated_at)
         VALUES
            (:disk, :directory, :filename, :original_name, :mime_type, :extension,
             :size_bytes, :width, :height, :alt_text, :checksum, :uploaded_by,
             NOW(), NOW())',
        [
            'disk' => 'local',
            'directory' => $directory,
            'filename' => $filename,
            'original_name' => mb_substr($originalName, 0, 255),
            'mime_type' => $mime,
            'extension' => $extension,
            'size_bytes' => $size,
            'width' => $width ?: null,
            'height' => $height ?: null,
            'alt_text' => content_post('media_alt') ?: null,
            'checksum' => $checksum,
            'uploaded_by' => $userId,
        ]
    );

    $row = db_fetch_one(
        'SELECT id FROM media WHERE directory = :directory AND filename = :filename LIMIT 1',
        ['directory' => $directory, 'filename' => $filename]
    );

    return isset($row['id']) ? (int) $row['id'] : null;
}

function content_next_order(string $table, ?int $sectionId = null): int
{
    if ($table === 'content_items' && $sectionId !== null) {
        $row = db_fetch_one(
            'SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_order
             FROM content_items WHERE section_id = :section_id',
            ['section_id' => $sectionId]
        );
    } else {
        $row = db_fetch_one(
            'SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_order
             FROM content_sections'
        );
    }

    return (int) ($row['next_order'] ?? 10);
}

function content_move(string $table, int $id, string $direction): void
{
    if (!in_array($table, ['content_sections', 'content_items'], true)) {
        throw new RuntimeException('Tipo de contenido no válido.');
    }

    $current = db_fetch_one(
        "SELECT id, sort_order" . ($table === 'content_items' ? ', section_id' : '') .
        " FROM {$table} WHERE id = :id LIMIT 1",
        ['id' => $id]
    );

    if ($current === null) {
        throw new RuntimeException('El registro no existe.');
    }

    $operator = $direction === 'up' ? '<' : '>';
    $order = $direction === 'up' ? 'DESC' : 'ASC';
    $params = ['sort_order' => (int) $current['sort_order']];
    $whereSection = '';

    if ($table === 'content_items') {
        $whereSection = ' AND section_id = :section_id';
        $params['section_id'] = (int) $current['section_id'];
    }

    $neighbor = db_fetch_one(
        "SELECT id, sort_order FROM {$table}
         WHERE sort_order {$operator} :sort_order {$whereSection}
         ORDER BY sort_order {$order}, id {$order}
         LIMIT 1",
        $params
    );

    if ($neighbor === null) {
        return;
    }

    db_execute(
        "UPDATE {$table} SET sort_order = :sort_order WHERE id = :id",
        ['sort_order' => (int) $neighbor['sort_order'], 'id' => $id]
    );
    db_execute(
        "UPDATE {$table} SET sort_order = :sort_order WHERE id = :id",
        ['sort_order' => (int) $current['sort_order'], 'id' => (int) $neighbor['id']]
    );
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'POST') {
    if (!auth_verify_csrf(content_post('csrf_token'))) {
        $errors[] = 'La sesión del formulario expiró. Recarga la página.';
    } else {
        $action = content_post('action');

        try {
            if ($action === 'save_section') {
                $sectionId = content_int('section_id');
                $title = content_post('title');
                $sectionKeyInput = content_post('section_key');
                $settingsJson = content_json_or_null(
                    content_post('settings_json'),
                    'La configuración avanzada',
                    $errors
                );
                $uploadedMediaId = content_upload_media($errors, (int) $user['id']);
                $selectedMediaId = content_int('media_id');
                $mediaId = $uploadedMediaId ?? $selectedMediaId;

                if ($title === '') {
                    $errors[] = 'El título de la sección es obligatorio.';
                }

                if ($errors === []) {
                    $key = content_unique_key(
                        $sectionKeyInput !== '' ? $sectionKeyInput : $title,
                        $sectionId
                    );
                    $sortOrder = content_int('sort_order')
                        ?? content_next_order('content_sections');
                    $params = [
                        'section_key' => $key,
                        'title' => $title,
                        'eyebrow' => content_post('eyebrow') ?: null,
                        'subtitle' => content_post('subtitle') ?: null,
                        'content' => content_post('content') ?: null,
                        'button_label' => content_post('button_label') ?: null,
                        'button_url' => content_post('button_url') ?: null,
                        'secondary_button_label' => content_post('secondary_button_label') ?: null,
                        'secondary_button_url' => content_post('secondary_button_url') ?: null,
                        'media_id' => $mediaId,
                        'settings_json' => $settingsJson,
                        'sort_order' => $sortOrder,
                        'is_enabled' => content_bool('is_enabled'),
                    ];

                    if ($sectionId === null) {
                        db_execute(
                            'INSERT INTO content_sections
                                (section_key, title, eyebrow, subtitle, content,
                                 button_label, button_url, secondary_button_label,
                                 secondary_button_url, media_id, settings_json,
                                 sort_order, is_enabled, created_at, updated_at)
                             VALUES
                                (:section_key, :title, :eyebrow, :subtitle, :content,
                                 :button_label, :button_url, :secondary_button_label,
                                 :secondary_button_url, :media_id, :settings_json,
                                 :sort_order, :is_enabled, NOW(), NOW())',
                            $params
                        );

                        $created = db_fetch_one(
                            'SELECT id FROM content_sections WHERE section_key = :section_key LIMIT 1',
                            ['section_key' => $key]
                        );
                        auth_log_activity(
                            'create_content_section',
                            'content_section',
                            isset($created['id']) ? (int) $created['id'] : null,
                            'Creó la sección "' . $title . '".'
                        );
                        $notice = 'Sección creada correctamente.';
                    } else {
                        $params['id'] = $sectionId;
                        db_execute(
                            'UPDATE content_sections SET
                                section_key = :section_key,
                                title = :title,
                                eyebrow = :eyebrow,
                                subtitle = :subtitle,
                                content = :content,
                                button_label = :button_label,
                                button_url = :button_url,
                                secondary_button_label = :secondary_button_label,
                                secondary_button_url = :secondary_button_url,
                                media_id = :media_id,
                                settings_json = :settings_json,
                                sort_order = :sort_order,
                                is_enabled = :is_enabled,
                                updated_at = NOW()
                             WHERE id = :id',
                            $params
                        );
                        auth_log_activity(
                            'update_content_section',
                            'content_section',
                            $sectionId,
                            'Actualizó la sección "' . $title . '".'
                        );
                        $notice = 'Sección actualizada correctamente.';
                    }
                }
            }

            if ($action === 'save_item') {
                $itemId = content_int('item_id');
                $sectionId = content_int('section_id');
                $metadataJson = content_json_or_null(
                    content_post('metadata_json'),
                    'Los metadatos',
                    $errors
                );
                $uploadedMediaId = content_upload_media($errors, (int) $user['id']);
                $selectedMediaId = content_int('media_id');
                $mediaId = $uploadedMediaId ?? $selectedMediaId;

                if ($sectionId === null) {
                    $errors[] = 'Selecciona una sección para el elemento.';
                }

                if (content_post('title') === '' && content_post('description') === '') {
                    $errors[] = 'El elemento necesita un título o una descripción.';
                }

                if ($errors === [] && $sectionId !== null) {
                    $params = [
                        'section_id' => $sectionId,
                        'item_key' => content_post('item_key') ?: null,
                        'title' => content_post('title') ?: null,
                        'subtitle' => content_post('subtitle') ?: null,
                        'description' => content_post('description') ?: null,
                        'value' => content_post('value') ?: null,
                        'label' => content_post('label') ?: null,
                        'url' => content_post('url') ?: null,
                        'icon' => content_post('icon') ?: null,
                        'media_id' => $mediaId,
                        'metadata_json' => $metadataJson,
                        'sort_order' => content_int('sort_order')
                            ?? content_next_order('content_items', $sectionId),
                        'is_enabled' => content_bool('is_enabled'),
                    ];

                    if ($itemId === null) {
                        db_execute(
                            'INSERT INTO content_items
                                (section_id, item_key, title, subtitle, description,
                                 value, label, url, icon, media_id, metadata_json,
                                 sort_order, is_enabled, created_at, updated_at)
                             VALUES
                                (:section_id, :item_key, :title, :subtitle, :description,
                                 :value, :label, :url, :icon, :media_id, :metadata_json,
                                 :sort_order, :is_enabled, NOW(), NOW())',
                            $params
                        );
                        auth_log_activity(
                            'create_content_item',
                            'content_item',
                            null,
                            'Creó un elemento de contenido.'
                        );
                        $notice = 'Elemento creado correctamente.';
                    } else {
                        $params['id'] = $itemId;
                        db_execute(
                            'UPDATE content_items SET
                                section_id = :section_id,
                                item_key = :item_key,
                                title = :title,
                                subtitle = :subtitle,
                                description = :description,
                                value = :value,
                                label = :label,
                                url = :url,
                                icon = :icon,
                                media_id = :media_id,
                                metadata_json = :metadata_json,
                                sort_order = :sort_order,
                                is_enabled = :is_enabled,
                                updated_at = NOW()
                             WHERE id = :id',
                            $params
                        );
                        auth_log_activity(
                            'update_content_item',
                            'content_item',
                            $itemId,
                            'Actualizó un elemento de contenido.'
                        );
                        $notice = 'Elemento actualizado correctamente.';
                    }
                }
            }

            if ($action === 'toggle_section' || $action === 'toggle_item') {
                $isSection = $action === 'toggle_section';
                $table = $isSection ? 'content_sections' : 'content_items';
                $id = content_int($isSection ? 'section_id' : 'item_id');

                if ($id === null) {
                    throw new RuntimeException('Registro no válido.');
                }

                db_execute(
                    "UPDATE {$table} SET is_enabled = IF(is_enabled = 1, 0, 1), updated_at = NOW() WHERE id = :id",
                    ['id' => $id]
                );
                $notice = 'Estado actualizado.';
            }

            if ($action === 'move_section' || $action === 'move_item') {
                $isSection = $action === 'move_section';
                $id = content_int($isSection ? 'section_id' : 'item_id');
                $direction = content_post('direction');

                if ($id === null || !in_array($direction, ['up', 'down'], true)) {
                    throw new RuntimeException('Movimiento no válido.');
                }

                content_move($isSection ? 'content_sections' : 'content_items', $id, $direction);
                $notice = 'Orden actualizado.';
            }

            if ($action === 'delete_section' || $action === 'delete_item') {
                auth_require_role(['administrator']);
                $isSection = $action === 'delete_section';
                $table = $isSection ? 'content_sections' : 'content_items';
                $id = content_int($isSection ? 'section_id' : 'item_id');

                if ($id === null) {
                    throw new RuntimeException('Registro no válido.');
                }

                db_execute("DELETE FROM {$table} WHERE id = :id", ['id' => $id]);
                auth_log_activity(
                    $action,
                    $isSection ? 'content_section' : 'content_item',
                    $id,
                    $isSection ? 'Eliminó una sección de contenido.' : 'Eliminó un elemento de contenido.'
                );
                $notice = $isSection ? 'Sección eliminada.' : 'Elemento eliminado.';
            }
        } catch (Throwable $exception) {
            $errors[] = APP_DEBUG
                ? $exception->getMessage()
                : 'No fue posible completar la operación.';
        }
    }
}

$editSectionId = filter_input(INPUT_GET, 'edit_section', FILTER_VALIDATE_INT);
$editItemId = filter_input(INPUT_GET, 'edit_item', FILTER_VALIDATE_INT);
$selectedSectionId = filter_input(INPUT_GET, 'section', FILTER_VALIDATE_INT);

$editingSection = $editSectionId !== false && $editSectionId !== null
    ? db_fetch_one('SELECT * FROM content_sections WHERE id = :id LIMIT 1', ['id' => (int) $editSectionId])
    : null;

$editingItem = $editItemId !== false && $editItemId !== null
    ? db_fetch_one('SELECT * FROM content_items WHERE id = :id LIMIT 1', ['id' => (int) $editItemId])
    : null;

if ($editingItem !== null) {
    $selectedSectionId = (int) $editingItem['section_id'];
}

$sections = db_fetch_all(
    'SELECT cs.*, m.directory, m.filename, m.alt_text,
            (SELECT COUNT(*) FROM content_items ci WHERE ci.section_id = cs.id) AS item_count
     FROM content_sections cs
     LEFT JOIN media m ON m.id = cs.media_id
     ORDER BY cs.sort_order ASC, cs.id ASC'
);

$items = [];
if ($selectedSectionId !== false && $selectedSectionId !== null) {
    $items = db_fetch_all(
        'SELECT ci.*, m.directory, m.filename, m.alt_text
         FROM content_items ci
         LEFT JOIN media m ON m.id = ci.media_id
         WHERE ci.section_id = :section_id
         ORDER BY ci.sort_order ASC, ci.id ASC',
        ['section_id' => (int) $selectedSectionId]
    );
}

$mediaLibrary = db_fetch_all(
    'SELECT id, directory, filename, original_name, alt_text, mime_type
     FROM media
     WHERE mime_type LIKE :mime
     ORDER BY created_at DESC
     LIMIT 100',
    ['mime' => 'image/%']
);

$sectionForm = [
    'id' => $editingSection['id'] ?? '',
    'section_key' => $editingSection['section_key'] ?? '',
    'title' => $editingSection['title'] ?? '',
    'eyebrow' => $editingSection['eyebrow'] ?? '',
    'subtitle' => $editingSection['subtitle'] ?? '',
    'content' => $editingSection['content'] ?? '',
    'button_label' => $editingSection['button_label'] ?? '',
    'button_url' => $editingSection['button_url'] ?? '',
    'secondary_button_label' => $editingSection['secondary_button_label'] ?? '',
    'secondary_button_url' => $editingSection['secondary_button_url'] ?? '',
    'media_id' => $editingSection['media_id'] ?? '',
    'settings_json' => $editingSection['settings_json'] ?? '',
    'sort_order' => $editingSection['sort_order'] ?? content_next_order('content_sections'),
    'is_enabled' => (int) ($editingSection['is_enabled'] ?? 1),
];

$itemForm = [
    'id' => $editingItem['id'] ?? '',
    'section_id' => $editingItem['section_id'] ?? ($selectedSectionId ?: ''),
    'item_key' => $editingItem['item_key'] ?? '',
    'title' => $editingItem['title'] ?? '',
    'subtitle' => $editingItem['subtitle'] ?? '',
    'description' => $editingItem['description'] ?? '',
    'value' => $editingItem['value'] ?? '',
    'label' => $editingItem['label'] ?? '',
    'url' => $editingItem['url'] ?? '',
    'icon' => $editingItem['icon'] ?? '',
    'media_id' => $editingItem['media_id'] ?? '',
    'metadata_json' => $editingItem['metadata_json'] ?? '',
    'sort_order' => $editingItem['sort_order'] ?? (
        $selectedSectionId ? content_next_order('content_items', (int) $selectedSectionId) : 10
    ),
    'is_enabled' => (int) ($editingItem['is_enabled'] ?? 1),
];

$csrfToken = auth_csrf_token();
?>
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="theme-color" content="#173d2e">
    <title>Contenido | <?= e(APP_NAME) ?></title>
    <style>
        :root{color-scheme:light;--ink:#17211c;--muted:#68736c;--paper:#f5f1e9;--surface:#fff;--line:#e1dace;--green:#245b45;--green-dark:#173d2e;--green-soft:#e8f0eb;--terracotta:#c85d3d;--danger:#a43b35;--shadow:0 18px 50px rgba(23,33,28,.08)}
        *{box-sizing:border-box}html{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:var(--paper)}body{min-width:320px;margin:0}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}.shell{display:grid;min-height:100vh;grid-template-columns:230px minmax(0,1fr)}.sidebar{padding:24px 18px;color:#fff;background:var(--green-dark)}.brand{display:flex;align-items:center;gap:11px;padding:0 10px 24px;font-weight:850}.brand__mark{display:grid;width:42px;aspect-ratio:1;place-items:center;border-radius:13px;background:rgba(255,255,255,.1)}.nav{display:grid;gap:5px}.nav a{display:flex;min-height:44px;align-items:center;border-radius:12px;padding:0 12px;color:rgba(255,255,255,.7);font-weight:700}.nav a:hover,.nav a.active{color:#fff;background:rgba(255,255,255,.1)}.main{min-width:0;padding:30px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.topbar h1{margin:0;font-size:clamp(2rem,4vw,2.8rem);letter-spacing:-.05em}.topbar p{margin:7px 0 0;color:var(--muted)}.top-actions{display:flex;gap:10px}.button{display:inline-flex;min-height:40px;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:999px;padding:0 14px;color:var(--ink);background:#fff;font-weight:800;cursor:pointer}.button:hover{border-color:var(--green);color:var(--green)}.button--primary{border-color:var(--green);color:#fff;background:var(--green)}.button--danger{border-color:rgba(164,59,53,.25);color:var(--danger);background:rgba(164,59,53,.06)}.button--small{min-height:32px;padding:0 10px;font-size:.74rem}.alert{margin-bottom:18px;border:1px solid;border-radius:14px;padding:13px 15px}.alert--error{border-color:rgba(164,59,53,.25);color:#762a26;background:rgba(164,59,53,.07)}.alert--success{border-color:rgba(36,91,69,.24);color:var(--green-dark);background:var(--green-soft)}.workspace{display:grid;grid-template-columns:minmax(290px,.75fr) minmax(0,1.25fr);gap:20px;align-items:start}.panel{border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden}.panel__header{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid var(--line);padding:18px 20px}.panel__header h2{margin:0;font-size:1rem}.section-list{display:grid}.section-card{display:grid;grid-template-columns:1fr auto;gap:14px;padding:17px 20px;border-bottom:1px solid var(--line)}.section-card:last-child{border-bottom:0}.section-card.active{background:var(--green-soft)}.section-card__title{font-weight:850}.section-card__meta{margin-top:4px;color:var(--muted);font-size:.74rem}.section-card__actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.status-dot{display:inline-block;width:8px;aspect-ratio:1;margin-right:5px;border-radius:50%;background:#9ca59f}.status-dot.on{background:var(--green)}.editor{display:grid;gap:20px}.tabs{display:flex;gap:8px;padding:14px 20px;border-bottom:1px solid var(--line);overflow-x:auto}.tab{display:inline-flex;min-height:36px;align-items:center;border:1px solid var(--line);border-radius:999px;padding:0 13px;font-size:.78rem;font-weight:800}.tab.active{border-color:var(--green);color:#fff;background:var(--green)}.form{display:grid;gap:17px;padding:20px}.grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.field{display:grid;gap:7px}.field label{font-size:.8rem;font-weight:800}.hint{color:var(--muted);font-size:.72rem;line-height:1.45}input,select,textarea{width:100%;border:1px solid var(--line);border-radius:12px;padding:11px 13px;color:var(--ink);background:#fff;outline:none}input:focus,select:focus,textarea:focus{border-color:var(--green);box-shadow:0 0 0 4px rgba(36,91,69,.12)}textarea{min-height:92px;resize:vertical}.editor-area{min-height:190px}.checkbox{display:flex;align-items:center;gap:9px}.checkbox input{width:auto}.form-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-top:4px}.items{display:grid}.item-card{display:grid;grid-template-columns:54px 1fr auto;gap:13px;align-items:center;padding:14px 20px;border-bottom:1px solid var(--line)}.item-card:last-child{border-bottom:0}.thumb{display:grid;width:54px;aspect-ratio:1;place-items:center;overflow:hidden;border-radius:12px;color:var(--muted);background:var(--paper);font-size:.72rem}.thumb img{width:100%;height:100%;object-fit:cover}.item-card strong{display:block}.item-card small{display:block;margin-top:4px;color:var(--muted)}.item-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.media-preview{display:flex;gap:12px;align-items:center}.media-preview img{width:88px;height:66px;object-fit:cover;border-radius:12px;border:1px solid var(--line)}details{border:1px dashed var(--line);border-radius:14px;padding:12px}summary{cursor:pointer;font-weight:800}.empty{padding:34px 20px;color:var(--muted);text-align:center}.modal{position:fixed;z-index:50;inset:0;display:none;place-items:center;padding:20px;background:rgba(17,25,21,.62)}.modal.open{display:grid}.modal__card{width:min(100%,900px);max-height:88vh;overflow:auto;border-radius:22px;background:#fff;box-shadow:0 30px 90px rgba(0,0,0,.25)}.modal__header{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--line);background:#fff}.preview{padding:30px}.preview__eyebrow{color:var(--terracotta);font-weight:850;text-transform:uppercase;letter-spacing:.12em;font-size:.72rem}.preview h2{font-size:clamp(2rem,5vw,4rem);letter-spacing:-.055em;margin:10px 0}.preview__subtitle{font-size:1.2rem;color:var(--muted)}.preview__content{line-height:1.75}.preview__actions{display:flex;gap:10px;margin-top:20px}.preview__button{display:inline-flex;min-height:44px;align-items:center;border-radius:999px;padding:0 17px;color:#fff;background:var(--green);font-weight:800}.preview__button.secondary{color:var(--green);background:var(--green-soft)}
        @media(max-width:1080px){.workspace{grid-template-columns:1fr}.sidebar{position:static}}@media(max-width:760px){.shell{grid-template-columns:1fr}.main{padding:22px 14px 40px}.topbar{align-items:flex-start;flex-direction:column}.grid-2{grid-template-columns:1fr}.section-card,.item-card{grid-template-columns:1fr}.item-card .thumb{display:none}}
    </style>
</head>
<body>
<div class="shell">
    <aside class="sidebar">
        <a class="brand" href="<?= e(relative_url('admin/')) ?>"><span class="brand__mark">EB</span><span><?= e(APP_NAME) ?></span></a>
        <nav class="nav" aria-label="Administración">
            <a href="<?= e(relative_url('admin/')) ?>">Resumen</a>
            <a href="<?= e(relative_url('admin/pages.php')) ?>">Páginas</a>
            <a class="active" href="<?= e(relative_url('admin/content.php')) ?>">Contenido</a>
            <a href="<?= e(relative_url('admin/media.php')) ?>">Multimedia</a>
            <a href="<?= e(relative_url('admin/messages.php')) ?>">Mensajes</a>
            <a href="<?= e(relative_url('admin/subscribers.php')) ?>">Suscriptores</a>
            <a href="<?= e(relative_url('admin/settings.php')) ?>">Configuración</a>
            <a href="<?= e(relative_url('admin/logout.php')) ?>">Cerrar sesión</a>
        </nav>
    </aside>

    <main class="main">
        <header class="topbar">
            <div><h1>Contenido</h1><p>Edita las secciones y los bloques visibles en la landing.</p></div>
            <div class="top-actions">
                <a class="button" href="<?= e(relative_url('')) ?>" target="_blank" rel="noopener">Ver sitio</a>
                <button class="button button--primary" type="button" data-preview-open>Vista previa</button>
            </div>
        </header>

        <?php if ($errors !== []): ?><div class="alert alert--error" role="alert"><?= e(implode(' ', $errors)) ?></div><?php endif ?>
        <?php if ($notice !== ''): ?><div class="alert alert--success"><?= e($notice) ?></div><?php endif ?>

        <div class="workspace">
            <section class="panel">
                <header class="panel__header"><h2>Secciones</h2><a class="button button--small" href="<?= e(relative_url('admin/content.php')) ?>">Nueva</a></header>
                <?php if ($sections === []): ?>
                    <div class="empty">No hay secciones creadas.</div>
                <?php else: ?>
                    <div class="section-list">
                        <?php foreach ($sections as $section): ?>
                            <article class="section-card <?= (int) $selectedSectionId === (int) $section['id'] ? 'active' : '' ?>">
                                <a href="?section=<?= e($section['id']) ?>">
                                    <div class="section-card__title"><span class="status-dot <?= (int) $section['is_enabled'] === 1 ? 'on' : '' ?>"></span><?= e($section['title'] ?: $section['section_key']) ?></div>
                                    <div class="section-card__meta"><?= e($section['section_key']) ?> · <?= e($section['item_count']) ?> elemento(s)</div>
                                </a>
                                <div class="section-card__actions">
                                    <a class="button button--small" href="?edit_section=<?= e($section['id']) ?>&section=<?= e($section['id']) ?>">Editar</a>
                                    <form method="post"><input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>"><input type="hidden" name="action" value="toggle_section"><input type="hidden" name="section_id" value="<?= e($section['id']) ?>"><button class="button button--small" type="submit"><?= (int) $section['is_enabled'] === 1 ? 'Ocultar' : 'Mostrar' ?></button></form>
                                    <form method="post"><input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>"><input type="hidden" name="action" value="move_section"><input type="hidden" name="section_id" value="<?= e($section['id']) ?>"><button class="button button--small" name="direction" value="up" title="Subir">↑</button><button class="button button--small" name="direction" value="down" title="Bajar">↓</button></form>
                                </div>
                            </article>
                        <?php endforeach ?>
                    </div>
                <?php endif ?>
            </section>

            <div class="editor">
                <section class="panel">
                    <div class="tabs">
                        <a class="tab <?= $editingItem === null ? 'active' : '' ?>" href="<?= $selectedSectionId ? '?edit_section=' . e($selectedSectionId) . '&section=' . e($selectedSectionId) : '?' ?>">Sección</a>
                        <?php if ($selectedSectionId): ?><a class="tab <?= $editingItem !== null ? 'active' : '' ?>" href="?section=<?= e($selectedSectionId) ?>#items">Elementos</a><?php endif ?>
                    </div>
                    <header class="panel__header"><h2><?= $editingSection !== null ? 'Editar sección' : 'Nueva sección' ?></h2></header>
                    <form class="form" method="post" enctype="multipart/form-data">
                        <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>"><input type="hidden" name="action" value="save_section"><input type="hidden" name="section_id" value="<?= e($sectionForm['id']) ?>">
                        <div class="grid-2"><div class="field"><label for="section-title">Título</label><input id="section-title" name="title" value="<?= e($sectionForm['title']) ?>" maxlength="255" required data-preview-title></div><div class="field"><label for="section-key">Clave</label><input id="section-key" name="section_key" value="<?= e($sectionForm['section_key']) ?>" maxlength="120" placeholder="hero" data-slug-source="#section-title"><span class="hint">Identificador técnico único.</span></div></div>
                        <div class="field"><label for="eyebrow">Antetítulo</label><input id="eyebrow" name="eyebrow" value="<?= e($sectionForm['eyebrow']) ?>" maxlength="190" data-preview-eyebrow></div>
                        <div class="field"><label for="subtitle">Subtítulo</label><textarea id="subtitle" name="subtitle" data-preview-subtitle><?= e($sectionForm['subtitle']) ?></textarea></div>
                        <div class="field"><label for="content">Contenido</label><textarea class="editor-area" id="content" name="content" data-preview-content><?= e($sectionForm['content']) ?></textarea><span class="hint">Admite texto y HTML controlado por administradores.</span></div>
                        <div class="grid-2"><div class="field"><label for="button-label">Botón principal</label><input id="button-label" name="button_label" value="<?= e($sectionForm['button_label']) ?>" maxlength="120" data-preview-button></div><div class="field"><label for="button-url">URL principal</label><input id="button-url" name="button_url" value="<?= e($sectionForm['button_url']) ?>" maxlength="500" placeholder="#contacto"></div></div>
                        <div class="grid-2"><div class="field"><label for="secondary-label">Botón secundario</label><input id="secondary-label" name="secondary_button_label" value="<?= e($sectionForm['secondary_button_label']) ?>" maxlength="120" data-preview-secondary></div><div class="field"><label for="secondary-url">URL secundaria</label><input id="secondary-url" name="secondary_button_url" value="<?= e($sectionForm['secondary_button_url']) ?>" maxlength="500"></div></div>
                        <div class="grid-2"><div class="field"><label for="media-id">Imagen de biblioteca</label><select id="media-id" name="media_id"><option value="">Sin imagen</option><?php foreach ($mediaLibrary as $media): ?><option value="<?= e($media['id']) ?>" <?= (string) $sectionForm['media_id'] === (string) $media['id'] ? 'selected' : '' ?>><?= e($media['original_name']) ?></option><?php endforeach ?></select></div><div class="field"><label for="media-file">Subir nueva imagen</label><input id="media-file" name="media_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><input name="media_alt" placeholder="Texto alternativo" maxlength="255"></div></div>
                        <?php if ($editingSection !== null && !empty($editingSection['filename'])): ?><div class="media-preview"><img src="<?= e(content_media_url($editingSection)) ?>" alt=""><span>Imagen actual</span></div><?php endif ?>
                        <div class="grid-2"><div class="field"><label for="sort-order">Orden</label><input id="sort-order" name="sort_order" type="number" value="<?= e($sectionForm['sort_order']) ?>"></div><label class="checkbox"><input name="is_enabled" type="checkbox" value="1" <?= (int) $sectionForm['is_enabled'] === 1 ? 'checked' : '' ?>> Sección visible</label></div>
                        <details><summary>Configuración avanzada</summary><div class="field" style="margin-top:12px"><label for="settings-json">JSON de configuración</label><textarea id="settings-json" name="settings_json" spellcheck="false"><?= e($sectionForm['settings_json']) ?></textarea><span class="hint">Ejemplo: {"theme":"dark","layout":"split"}</span></div></details>
                        <div class="form-actions"><button class="button button--primary" type="submit">Guardar sección</button><?php if ($editingSection !== null && auth_has_role(['administrator'])): ?><button class="button button--danger" type="submit" name="action" value="delete_section" onclick="return confirm('¿Eliminar la sección y todos sus elementos?')">Eliminar sección</button><?php endif ?></div>
                    </form>
                </section>

                <?php if ($selectedSectionId): ?>
                    <section class="panel" id="items">
                        <header class="panel__header"><h2>Elementos de la sección</h2><a class="button button--small" href="?section=<?= e($selectedSectionId) ?>#item-editor">Nuevo elemento</a></header>
                        <?php if ($items === []): ?><div class="empty">Esta sección todavía no tiene elementos.</div><?php else: ?><div class="items"><?php foreach ($items as $item): ?><article class="item-card"><div class="thumb"><?php if (!empty($item['filename'])): ?><img src="<?= e(content_media_url($item)) ?>" alt="<?= e($item['alt_text'] ?? '') ?>"><?php else: ?>Sin imagen<?php endif ?></div><div><strong><?= e($item['title'] ?: $item['label'] ?: 'Elemento sin título') ?></strong><small><span class="status-dot <?= (int) $item['is_enabled'] === 1 ? 'on' : '' ?>"></span><?= e($item['subtitle'] ?: $item['description'] ?: $item['item_key'] ?: '') ?></small></div><div class="item-actions"><a class="button button--small" href="?section=<?= e($selectedSectionId) ?>&edit_item=<?= e($item['id']) ?>#item-editor">Editar</a><form method="post"><input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>"><input type="hidden" name="action" value="toggle_item"><input type="hidden" name="item_id" value="<?= e($item['id']) ?>"><button class="button button--small" type="submit"><?= (int) $item['is_enabled'] === 1 ? 'Ocultar' : 'Mostrar' ?></button></form><form method="post"><input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>"><input type="hidden" name="action" value="move_item"><input type="hidden" name="item_id" value="<?= e($item['id']) ?>"><button class="button button--small" name="direction" value="up">↑</button><button class="button button--small" name="direction" value="down">↓</button></form></div></article><?php endforeach ?></div><?php endif ?>
                    </section>

                    <section class="panel" id="item-editor">
                        <header class="panel__header"><h2><?= $editingItem !== null ? 'Editar elemento' : 'Nuevo elemento' ?></h2><?php if ($editingItem !== null): ?><a class="button button--small" href="?section=<?= e($selectedSectionId) ?>#item-editor">Cancelar</a><?php endif ?></header>
                        <form class="form" method="post" enctype="multipart/form-data">
                            <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>"><input type="hidden" name="action" value="save_item"><input type="hidden" name="item_id" value="<?= e($itemForm['id']) ?>"><input type="hidden" name="section_id" value="<?= e($itemForm['section_id']) ?>">
                            <div class="grid-2"><div class="field"><label for="item-title">Título</label><input id="item-title" name="title" value="<?= e($itemForm['title']) ?>" maxlength="255"></div><div class="field"><label for="item-key">Clave opcional</label><input id="item-key" name="item_key" value="<?= e($itemForm['item_key']) ?>" maxlength="120"></div></div>
                            <div class="field"><label for="item-subtitle">Subtítulo</label><input id="item-subtitle" name="subtitle" value="<?= e($itemForm['subtitle']) ?>" maxlength="255"></div>
                            <div class="field"><label for="description">Descripción</label><textarea id="description" name="description"><?= e($itemForm['description']) ?></textarea></div>
                            <div class="grid-2"><div class="field"><label for="value">Valor</label><input id="value" name="value" value="<?= e($itemForm['value']) ?>" maxlength="120" placeholder="25%"></div><div class="field"><label for="label">Etiqueta</label><input id="label" name="label" value="<?= e($itemForm['label']) ?>" maxlength="190"></div></div>
                            <div class="grid-2"><div class="field"><label for="item-url">URL</label><input id="item-url" name="url" value="<?= e($itemForm['url']) ?>" maxlength="500"></div><div class="field"><label for="icon">Icono</label><input id="icon" name="icon" value="<?= e($itemForm['icon']) ?>" maxlength="100" placeholder="store"></div></div>
                            <div class="grid-2"><div class="field"><label for="item-media-id">Imagen de biblioteca</label><select id="item-media-id" name="media_id"><option value="">Sin imagen</option><?php foreach ($mediaLibrary as $media): ?><option value="<?= e($media['id']) ?>" <?= (string) $itemForm['media_id'] === (string) $media['id'] ? 'selected' : '' ?>><?= e($media['original_name']) ?></option><?php endforeach ?></select></div><div class="field"><label for="item-media-file">Subir nueva imagen</label><input id="item-media-file" name="media_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><input name="media_alt" placeholder="Texto alternativo" maxlength="255"></div></div>
                            <div class="grid-2"><div class="field"><label for="item-order">Orden</label><input id="item-order" name="sort_order" type="number" value="<?= e($itemForm['sort_order']) ?>"></div><label class="checkbox"><input name="is_enabled" type="checkbox" value="1" <?= (int) $itemForm['is_enabled'] === 1 ? 'checked' : '' ?>> Elemento visible</label></div>
                            <details><summary>Metadatos avanzados</summary><div class="field" style="margin-top:12px"><label for="metadata-json">JSON</label><textarea id="metadata-json" name="metadata_json" spellcheck="false"><?= e($itemForm['metadata_json']) ?></textarea></div></details>
                            <div class="form-actions"><button class="button button--primary" type="submit">Guardar elemento</button><?php if ($editingItem !== null && auth_has_role(['administrator'])): ?><button class="button button--danger" type="submit" name="action" value="delete_item" onclick="return confirm('¿Eliminar este elemento?')">Eliminar elemento</button><?php endif ?></div>
                        </form>
                    </section>
                <?php endif ?>
            </div>
        </div>
    </main>
</div>

<div class="modal" data-preview-modal aria-hidden="true">
    <section class="modal__card" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <header class="modal__header"><strong>Vista previa de la sección</strong><button class="button button--small" type="button" data-preview-close>Cerrar</button></header>
        <div class="preview"><div class="preview__eyebrow" data-preview-output="eyebrow"><?= e($sectionForm['eyebrow']) ?></div><h2 id="preview-title" data-preview-output="title"><?= e($sectionForm['title'] ?: 'Título de la sección') ?></h2><p class="preview__subtitle" data-preview-output="subtitle"><?= e($sectionForm['subtitle']) ?></p><div class="preview__content" data-preview-output="content"><?= nl2br(e($sectionForm['content'])) ?></div><div class="preview__actions"><span class="preview__button" data-preview-output="button"><?= e($sectionForm['button_label'] ?: 'Botón principal') ?></span><span class="preview__button secondary" data-preview-output="secondary"><?= e($sectionForm['secondary_button_label'] ?: 'Botón secundario') ?></span></div></div>
    </section>
</div>

<script>
(() => {
    'use strict';
    const modal = document.querySelector('[data-preview-modal]');
    const openButton = document.querySelector('[data-preview-open]');
    const closeButton = document.querySelector('[data-preview-close]');
    const bindings = {title: '[data-preview-title]', eyebrow: '[data-preview-eyebrow]', subtitle: '[data-preview-subtitle]', content: '[data-preview-content]', button: '[data-preview-button]', secondary: '[data-preview-secondary]'};
    const updatePreview = () => {
        Object.entries(bindings).forEach(([key, selector]) => {
            const input = document.querySelector(selector);
            const output = document.querySelector(`[data-preview-output="${key}"]`);
            if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || !(output instanceof HTMLElement)) return;
            output.textContent = input.value || (key === 'title' ? 'Título de la sección' : '');
        });
    };
    const close = () => { if (!(modal instanceof HTMLElement)) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };
    openButton?.addEventListener('click', () => { if (!(modal instanceof HTMLElement)) return; updatePreview(); modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); });
    closeButton?.addEventListener('click', close);
    modal?.addEventListener('click', event => { if (event.target === modal) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });

    const title = document.querySelector('#section-title');
    const key = document.querySelector('#section-key');
    let keyTouched = key instanceof HTMLInputElement && key.value !== '';
    key?.addEventListener('input', () => { keyTouched = true; });
    title?.addEventListener('input', () => {
        if (!(title instanceof HTMLInputElement) || !(key instanceof HTMLInputElement) || keyTouched) return;
        key.value = title.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    });
})();
</script>
</body>
</html>
