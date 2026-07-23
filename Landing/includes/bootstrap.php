<?php
declare(strict_types=1);

if (defined('EL_BARRIO_BOOTSTRAP_LOADED')) return;
define('EL_BARRIO_BOOTSTRAP_LOADED', true);

require_once dirname(__DIR__) . '/config/app.php';
require_once __DIR__ . '/functions.php';

if (!headers_sent()) {
    header('Content-Type: text/html; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), camera=(), microphone=()');
}

if (session_status() === PHP_SESSION_NONE) {
    session_name('elbarrio_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => app_base_path() === '' ? '/' : app_base_path() . '/',
        'secure' => app_is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

if (!defined('REQUEST_ID')) {
    try { define('REQUEST_ID', bin2hex(random_bytes(8))); }
    catch (Throwable) { define('REQUEST_ID', str_replace('.', '', uniqid('', true))); }
}

set_exception_handler(static function (Throwable $e): void {
    $line = sprintf("[%s] [%s] %s in %s:%d\n", date('c'), REQUEST_ID, $e->getMessage(), $e->getFile(), $e->getLine());
    if (is_dir(LOGS_PATH) && is_writable(LOGS_PATH)) error_log($line, 3, LOGS_PATH . '/application.log');
    else error_log($line);
    if (!headers_sent()) http_response_code(500);
    echo APP_DEBUG
        ? '<pre>' . e((string) $e) . '</pre>'
        : '<!doctype html><html lang="es"><meta charset="utf-8"><title>Error</title><main><h1>Error temporal</h1><p>Referencia: '.e(REQUEST_ID).'</p></main></html>';
});

function request_is_install_route(): bool
{
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    return str_contains($script, '/install/') || str_ends_with($script, '/install.php');
}

function require_installation(): void
{
    if (!app_is_installed() && !request_is_install_route()) redirect_to('install.php');
}

if (app_is_installed()) require_once __DIR__ . '/database.php';
