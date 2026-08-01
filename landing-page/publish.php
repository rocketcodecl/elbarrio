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
