<?php
declare(strict_types=1);

const LANDING_ROOT = __DIR__ . '/..';
const CONTENT_DIR = LANDING_ROOT . '/content';
const CONTENT_FILE = CONTENT_DIR . '/site.json';
const DEFAULTS_FILE = CONTENT_DIR . '/defaults.json';
const ADMIN_CONFIG = __DIR__ . '/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'samesite' => 'Strict',
    ]);
    session_start();
}

function installed(): bool
{
    return is_file(ADMIN_CONFIG);
}

function admin_config(): array
{
    if (!installed()) {
        return [];
    }
    $config = require ADMIN_CONFIG;
    return is_array($config) ? $config : [];
}

function is_logged_in(): bool
{
    return !empty($_SESSION['landing_admin']);
}

function require_login(): void
{
    if (!is_logged_in()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'message' => 'Sesión expirada. Vuelve a ingresar.']);
        exit;
    }
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    return $_SESSION['csrf'];
}

function verify_csrf(?string $token): void
{
    if (!$token || !hash_equals(csrf_token(), $token)) {
        http_response_code(419);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'message' => 'La sesión de seguridad venció. Recarga el panel.']);
        exit;
    }
}

function read_json_file(string $path): array
{
    $raw = @file_get_contents($path);
    $decoded = $raw ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function write_json_atomic(string $path, array $data): bool
{
    $temporary = $path . '.tmp';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($temporary, $json . PHP_EOL, LOCK_EX) === false) {
        return false;
    }
    return rename($temporary, $path);
}

function escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
