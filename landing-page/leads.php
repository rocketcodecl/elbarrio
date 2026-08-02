<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
$dir = __DIR__ . '/data';
$file = $dir . '/leads.json';
function answer(int $status, array $payload): never { http_response_code($status); echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function read_leads(string $path): array { $raw = @file_get_contents($path); $data = $raw ? json_decode($raw, true) : []; return is_array($data) ? $data : []; }
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $configFile = __DIR__ . '/publish-config.php';
    $config = is_file($configFile) ? require $configFile : [];
    $expected = (string)($config['token'] ?? '');
    $authorization = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    $provided = str_starts_with($authorization, 'Bearer ') ? substr($authorization, 7) : '';
    if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) answer(401, ['ok' => false, 'message' => 'Acceso no autorizado.']);
    answer(200, ['ok' => true, 'data' => array_reverse(read_leads($file))]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') answer(405, ['ok' => false, 'message' => 'Método no permitido.']);
$input = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($input) || trim((string)($input['sitio'] ?? '')) !== '') answer(422, ['ok' => false, 'message' => 'Solicitud inválida.']);
$name = trim((string)($input['nombre'] ?? ''));
$email = strtolower(trim((string)($input['correo'] ?? '')));
$whatsapp = trim((string)($input['whatsapp'] ?? ''));
$comuna = trim((string)($input['comuna'] ?? ''));
$type = trim((string)($input['tipo'] ?? 'Vecino'));
if (mb_strlen($name) < 2 || mb_strlen($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($whatsapp) < 8 || mb_strlen($whatsapp) > 30 || mb_strlen($comuna) < 2 || mb_strlen($comuna) > 80 || !in_array($type, ['Vecino', 'Comercio', 'Servicio'], true)) answer(422, ['ok' => false, 'message' => 'Revisa los datos ingresados.']);
if (!is_dir($dir) && !mkdir($dir, 0755, true)) answer(500, ['ok' => false, 'message' => 'No fue posible preparar el registro.']);
$entries = read_leads($file);
$entry = ['id' => bin2hex(random_bytes(12)), 'name' => $name, 'email' => $email, 'whatsapp' => $whatsapp, 'comuna' => $comuna, 'type' => $type, 'created_at' => gmdate('c')];
$found = false;
foreach ($entries as $index => $existing) { if (strtolower((string)($existing['email'] ?? '')) === $email) { $entry['id'] = (string)($existing['id'] ?? $entry['id']); $entries[$index] = $entry; $found = true; break; } }
if (!$found) $entries[] = $entry;
$temp = $file . '.tmp';
$json = json_encode($entries, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false || file_put_contents($temp, $json . PHP_EOL, LOCK_EX) === false || !rename($temp, $file)) answer(500, ['ok' => false, 'message' => 'No fue posible guardar tus datos.']);
answer(200, ['ok' => true, 'message' => 'Listo. Te avisaremos cuando abramos en tu comuna.']);
