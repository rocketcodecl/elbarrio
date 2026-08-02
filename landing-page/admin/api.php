<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
require_login();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);

$request = json_decode((string)file_get_contents('php://input'), true);
$action = is_array($request) ? (string)($request['action'] ?? '') : '';

if ($action === 'upload_media') {
    $slot = (string)($request['slot'] ?? '');
    $file = (string)($request['file'] ?? '');
    $remote = publish_remote_media($slot, $file);
    if (empty($remote['ok'])) { http_response_code(502); }
    echo json_encode($remote);
    exit;
}

if ($action === 'upload_image') {
    $slot = (string)($request['slot'] ?? '');
    $file = (string)($request['file'] ?? '');
    $remote = publish_remote_media($slot, $file, 'upload_image');
    if (empty($remote['ok'])) { http_response_code(502); }
    echo json_encode($remote);
    exit;
}

if ($action === 'reset') {
    $defaults = read_json_file(DEFAULTS_FILE);
    $remote = $defaults ? publish_remote($defaults) : ['ok' => false];
    if (!$defaults || empty($remote['ok']) || !write_json_atomic(CONTENT_FILE, $defaults)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => $remote['message'] ?? 'No fue posible restaurar el contenido.']);
        exit;
    }
    echo json_encode(['ok' => true, 'message' => 'Contenido original restaurado.', 'data' => $defaults]);
    exit;
}

if ($action !== 'save' || !isset($request['data']) || !is_array($request['data'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Solicitud inválida.']);
    exit;
}

$defaults = read_json_file(DEFAULTS_FILE);
$incoming = $request['data'];
$clean = $defaults;

$textPaths = [];
foreach (($defaults['content'] ?? []) as $group => $fields) {
    foreach (array_keys(is_array($fields) ? $fields : []) as $key) {
        $textPaths[] = [$group, $key];
    }
}

foreach ($textPaths as [$group, $key]) {
    $value = trim((string)($incoming['content'][$group][$key] ?? $defaults['content'][$group][$key] ?? ''));
    if ($value === '' || mb_strlen($value) > 500) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'message' => "Revisa el campo {$group}.{$key}."]);
        exit;
    }
    $clean['content'][$group][$key] = $value;
}

$clean['sizes']['heroTitle'] = max(48, min(90, (int)($incoming['sizes']['heroTitle'] ?? 72)));
$clean['sizes']['sectionTitle'] = max(48, min(90, (int)($incoming['sizes']['sectionTitle'] ?? 72)));
$clean['sizes']['body'] = max(14, min(20, (int)($incoming['sizes']['body'] ?? 16)));
$clean['updatedAt'] = gmdate('c');

$remote = publish_remote($clean);
if (empty($remote['ok'])) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'message' => $remote['message'] ?? 'La landing no recibió los cambios.']);
    exit;
}

if (!write_json_atomic(CONTENT_FILE, $clean)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'No fue posible guardar. Revisa los permisos de content/.']);
    exit;
}

echo json_encode(['ok' => true, 'message' => 'Cambios publicados.', 'data' => $clean]);
