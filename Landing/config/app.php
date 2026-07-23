<?php

declare(strict_types=1);

/**
 * El Barrio Landing
 * Configuración general de la aplicación.
 *
 * Este archivo no contiene credenciales de base de datos.
 * Las credenciales se crearán posteriormente mediante el instalador.
 */

if (!defined('EL_BARRIO_BOOTSTRAPPED')) {
    define('EL_BARRIO_BOOTSTRAPPED', true);
}

/*
|--------------------------------------------------------------------------
| Entorno y depuración
|--------------------------------------------------------------------------
|
| En producción, APP_DEBUG debe permanecer en false.
| Durante el desarrollo local puedes cambiarlo temporalmente a true.
|
*/

const APP_ENV = 'production';
const APP_DEBUG = false;

/*
|--------------------------------------------------------------------------
| Identidad de la aplicación
|--------------------------------------------------------------------------
*/

const APP_NAME = 'El Barrio';
const APP_VERSION = '0.1.0';
const APP_LOCALE = 'es_CL';
const APP_TIMEZONE = 'America/Santiago';

/*
|--------------------------------------------------------------------------
| Rutas internas
|--------------------------------------------------------------------------
|
| Estas rutas se calculan desde la ubicación del propio proyecto.
| No dependen de la ruta absoluta del servidor ni de una carpeta externa.
|
*/

define('APP_ROOT', dirname(__DIR__));
define('CONFIG_PATH', APP_ROOT . '/config');
define('INCLUDES_PATH', APP_ROOT . '/includes');
define('PAGES_PATH', APP_ROOT . '/pages');
define('ADMIN_PATH', APP_ROOT . '/admin');
define('INSTALL_PATH', APP_ROOT . '/install');
define('ASSETS_PATH', APP_ROOT . '/assets');
define('UPLOADS_PATH', APP_ROOT . '/uploads');
define('STORAGE_PATH', APP_ROOT . '/storage');

define('CACHE_PATH', STORAGE_PATH . '/cache');
define('LOGS_PATH', STORAGE_PATH . '/logs');
define('BACKUPS_PATH', STORAGE_PATH . '/backups');

define('INSTALL_LOCK_FILE', CONFIG_PATH . '/installed.lock');
define('DATABASE_CONFIG_FILE', CONFIG_PATH . '/database.php');

/*
|--------------------------------------------------------------------------
| Zona horaria y configuración de errores
|--------------------------------------------------------------------------
*/

date_default_timezone_set(APP_TIMEZONE);

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('log_errors', '1');
}

/*
|--------------------------------------------------------------------------
| Detección segura de HTTPS
|--------------------------------------------------------------------------
*/

function app_is_https(): bool
{
    if (
        isset($_SERVER['HTTPS']) &&
        $_SERVER['HTTPS'] !== '' &&
        strtolower((string) $_SERVER['HTTPS']) !== 'off'
    ) {
        return true;
    }

    if (
        isset($_SERVER['HTTP_X_FORWARDED_PROTO']) &&
        strtolower(trim(explode(',', (string) $_SERVER['HTTP_X_FORWARDED_PROTO'])[0])) === 'https'
    ) {
        return true;
    }

    return isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443;
}

/*
|--------------------------------------------------------------------------
| Host actual
|--------------------------------------------------------------------------
|
| Se limpia el encabezado Host para impedir caracteres no válidos.
| En producción se recomienda mantener el dominio apuntando directamente
| al document root configurado en Plesk.
|
*/

function app_host(): string
{
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'elbarrio.lat');
    $host = preg_replace('/[^a-zA-Z0-9.\-:\[\]]/', '', $host) ?: 'elbarrio.lat';

    return strtolower($host);
}

/*
|--------------------------------------------------------------------------
| Ruta base de la instalación
|--------------------------------------------------------------------------
|
| Funciona tanto si el proyecto se publica directamente en:
| https://elbarrio.lat/
|
| como si se prueba temporalmente dentro de una subcarpeta:
| https://dominio.test/Landing/
|
*/

function app_base_path(): string
{
    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
    $directory = rtrim(dirname($scriptName), '/.');

    if (preg_match('#/(admin|api|install)$#', $directory) === 1) {
        $directory = dirname($directory);
        $directory = $directory === DIRECTORY_SEPARATOR ? '' : $directory;
    }

    if ($directory === '' || $directory === '/') {
        return '';
    }

    return '/' . trim($directory, '/');
}

/*
|--------------------------------------------------------------------------
| URL base
|--------------------------------------------------------------------------
*/

function app_url(string $path = ''): string
{
    $scheme = app_is_https() ? 'https' : 'http';
    $base = $scheme . '://' . app_host() . app_base_path();

    if ($path === '') {
        return $base . '/';
    }

    return $base . '/' . ltrim($path, '/');
}

/*
|--------------------------------------------------------------------------
| URL relativa
|--------------------------------------------------------------------------
|
| Se usa para enlaces, formularios y recursos internos sin fijar el dominio.
|
| Ejemplos:
|   relative_url('admin/')              -> ./admin/ o /Landing/admin/
|   relative_url('assets/css/base.css') -> ./assets/css/base.css
|
*/

function relative_url(string $path = ''): string
{
    $basePath = app_base_path();
    $cleanPath = ltrim($path, '/');

    if ($cleanPath === '') {
        return $basePath === '' ? './' : $basePath . '/';
    }

    return ($basePath === '' ? './' : $basePath . '/') . $cleanPath;
}

/*
|--------------------------------------------------------------------------
| Recursos estáticos y archivos subidos
|--------------------------------------------------------------------------
*/

function asset_url(string $path): string
{
    return relative_url('assets/' . ltrim($path, '/'));
}

function upload_url(string $path): string
{
    return relative_url('uploads/' . ltrim($path, '/'));
}

/*
|--------------------------------------------------------------------------
| Estado de instalación
|--------------------------------------------------------------------------
*/

function app_is_installed(): bool
{
    return is_file(INSTALL_LOCK_FILE) && is_file(DATABASE_CONFIG_FILE);
}

/*
|--------------------------------------------------------------------------
| Redirección segura
|--------------------------------------------------------------------------
*/

function redirect_to(string $path, int $statusCode = 302): never
{
    header('Location: ' . relative_url($path), true, $statusCode);
    exit;
}

/*
|--------------------------------------------------------------------------
| Escape HTML
|--------------------------------------------------------------------------
*/

function e(null|string|int|float|bool $value): string
{
    return htmlspecialchars(
        (string) $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
}

/*
|--------------------------------------------------------------------------
| Configuración pública disponible para el resto del proyecto
|--------------------------------------------------------------------------
*/

return [
    'name' => APP_NAME,
    'version' => APP_VERSION,
    'environment' => APP_ENV,
    'debug' => APP_DEBUG,
    'locale' => APP_LOCALE,
    'timezone' => APP_TIMEZONE,
    'base_path' => app_base_path(),
    'base_url' => app_url(),
    'installed' => app_is_installed(),
];
