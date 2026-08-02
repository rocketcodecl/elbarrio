<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configFile = __DIR__ . '/publish-config.php';
if (!is_file($configFile)) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'message' => 'Receptor no configurado.']);
    exit;
}
$config = require $configFile;
$expected = (string)($config['token'] ?? '');
$authorization = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
$provided = str_starts_with($authorization, 'Bearer ') ? substr($authorization, 7) : '';

if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => 'Conexión no autorizada.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => true, 'message' => 'Receptor activo.']);
    exit;
}

$request = json_decode((string)file_get_contents('php://input'), true);
$action = is_array($request) ? (string)($request['action'] ?? '') : '';
if ($action === 'upload_media') {
    $slots = ['distancia', 'pregunta', 'encuentro', 'comunidad'];
    $slot = (string)($request['slot'] ?? '');
    $encoded = (string)($request['file'] ?? '');
    if (!in_array($slot, $slots, true) || !preg_match('~^data:video/mp4;base64,(.+)$~s', $encoded, $match)) {
        http_response_code(422); echo json_encode(['ok' => false, 'message' => 'Video inválido. Usa formato MP4.']); exit;
    }
    $binary = base64_decode($match[1], true);
    if ($binary === false || strlen($binary) > 25 * 1024 * 1024) {
        http_response_code(422); echo json_encode(['ok' => false, 'message' => 'El video supera 25 MB o está dañado.']); exit;
    }
    $target = __DIR__ . '/assets/scene-' . $slot . '.mp4';
    $temporary = $target . '.tmp';
    if (file_put_contents($temporary, $binary, LOCK_EX) === false || !rename($temporary, $target)) {
        http_response_code(500); echo json_encode(['ok' => false, 'message' => 'No fue posible guardar el video.']); exit;
    }
    echo json_encode(['ok' => true, 'message' => 'Video actualizado.']); exit;
}
if ($action === 'upload_image') {
    $slots = ['hero-phone', 'bg-inicio', 'phone-inicio', 'bg-servicios', 'phone-servicios', 'bg-mercado', 'phone-mercado', 'bg-eventos', 'phone-eventos', 'screen-inicio', 'screen-servicios', 'screen-mercado', 'screen-eventos', 'commerce-panel-1', 'commerce-panel-2', 'commerce-panel-3', 'commerce-panel-4', 'service-panel-1', 'service-panel-2', 'service-panel-3', 'service-panel-4'];
    $slot = (string)($request['slot'] ?? '');
    $encoded = (string)($request['file'] ?? '');
    if (!in_array($slot, $slots, true) || !preg_match('~^data:image/(jpeg|png|webp);base64,(.+)$~s', $encoded, $match)) {
        http_response_code(422); echo json_encode(['ok' => false, 'message' => 'Imagen inválida. Usa JPG, PNG o WEBP.']); exit;
    }
    if ($slot === 'hero-phone' && $match[1] !== 'png') {
        http_response_code(422); echo json_encode(['ok' => false, 'message' => 'La composición del hero debe ser PNG.']); exit;
    }
    $binary = base64_decode($match[2], true);
    if ($binary === false || strlen($binary) > 8 * 1024 * 1024) {
        http_response_code(422); echo json_encode(['ok' => false, 'message' => 'La imagen supera 8 MB o está dañada.']); exit;
    }
    $target = __DIR__ . '/assets/story-' . $slot . ($slot === 'hero-phone' ? '.png' : '.jpg');
    $temporary = $target . '.tmp';
    if (file_put_contents($temporary, $binary, LOCK_EX) === false || !rename($temporary, $target)) {
        http_response_code(500); echo json_encode(['ok' => false, 'message' => 'No fue posible guardar la imagen.']); exit;
    }
    echo json_encode(['ok' => true, 'message' => 'Imagen actualizada.']); exit;
}
$data = is_array($request) ? ($request['data'] ?? null) : null;
if (!is_array($data) || !isset($data['content'], $data['sizes'])) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Contenido inválido.']);
    exit;
}

$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$target = __DIR__ . '/content/site.json';
$temporary = $target . '.tmp';
if ($json === false || file_put_contents($temporary, $json . PHP_EOL, LOCK_EX) === false || !rename($temporary, $target)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'elbarrio.lat no pudo escribir content/site.json.']);
    exit;
}

echo json_encode(['ok' => true, 'message' => 'Landing actualizada.']);
