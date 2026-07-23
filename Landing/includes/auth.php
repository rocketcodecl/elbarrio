<?php

declare(strict_types=1);

/**
 * El Barrio
 * Autenticación y autorización del panel administrativo.
 */

require_once __DIR__ . '/database.php';

/**
 * Claves usadas en la sesión.
 */
const AUTH_SESSION_USER_ID = 'auth_user_id';
const AUTH_SESSION_FINGERPRINT = 'auth_fingerprint';
const AUTH_SESSION_LAST_ACTIVITY = 'auth_last_activity';
const AUTH_SESSION_REGENERATED_AT = 'auth_regenerated_at';

/**
 * Tiempo máximo de inactividad: 60 minutos.
 */
const AUTH_IDLE_TIMEOUT = 3600;

/**
 * Regeneración periódica del identificador de sesión: 15 minutos.
 */
const AUTH_REGENERATE_INTERVAL = 900;

/**
 * Límite de intentos fallidos dentro de la ventana configurada.
 */
const AUTH_MAX_ATTEMPTS = 5;
const AUTH_ATTEMPT_WINDOW_MINUTES = 15;

/**
 * Obtiene la IP del visitante.
 */
function auth_ip_address(): string
{
    $candidates = [
        $_SERVER['HTTP_CF_CONNECTING_IP'] ?? null,
        $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null,
        $_SERVER['REMOTE_ADDR'] ?? null,
    ];

    foreach ($candidates as $candidate) {
        if (!is_string($candidate) || trim($candidate) === '') {
            continue;
        }

        $ip = trim(explode(',', $candidate)[0]);

        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            return $ip;
        }
    }

    return '0.0.0.0';
}

/**
 * Devuelve un User-Agent limitado a 500 caracteres.
 */
function auth_user_agent(): string
{
    return mb_substr(
        trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? '')),
        0,
        500
    );
}

/**
 * Crea una huella moderada de la sesión.
 *
 * No se incluye la IP para evitar cierres de sesión por cambios normales
 * de red móvil. La huella sirve para detectar cambios abruptos del navegador.
 */
function auth_session_fingerprint(): string
{
    return hash('sha256', auth_user_agent());
}

/**
 * Devuelve la URL del formulario de acceso.
 */
function auth_login_url(): string
{
    return relative_url('admin/login.php');
}

/**
 * Devuelve la URL principal del panel.
 */
function auth_dashboard_url(): string
{
    return relative_url('admin/');
}

/**
 * Redirige y finaliza la solicitud.
 */
function auth_redirect(string $url): never
{
    header('Location: ' . $url, true, 302);
    exit;
}

/**
 * Normaliza un correo electrónico.
 */
function auth_normalize_email(string $email): string
{
    return mb_strtolower(trim($email));
}

/**
 * Comprueba si el usuario está autenticado.
 */
function auth_check(): bool
{
    $userId = $_SESSION[AUTH_SESSION_USER_ID] ?? null;

    if (!is_int($userId) && !ctype_digit((string) $userId)) {
        return false;
    }

    $lastActivity = (int) ($_SESSION[AUTH_SESSION_LAST_ACTIVITY] ?? 0);

    if (
        $lastActivity <= 0
        || (time() - $lastActivity) > AUTH_IDLE_TIMEOUT
    ) {
        auth_logout(false);

        return false;
    }

    $storedFingerprint = $_SESSION[AUTH_SESSION_FINGERPRINT] ?? '';

    if (
        !is_string($storedFingerprint)
        || !hash_equals($storedFingerprint, auth_session_fingerprint())
    ) {
        auth_logout(false);

        return false;
    }

    $_SESSION[AUTH_SESSION_LAST_ACTIVITY] = time();

    $regeneratedAt = (int) (
        $_SESSION[AUTH_SESSION_REGENERATED_AT] ?? 0
    );

    if ((time() - $regeneratedAt) >= AUTH_REGENERATE_INTERVAL) {
        session_regenerate_id(true);
        $_SESSION[AUTH_SESSION_REGENERATED_AT] = time();
    }

    return true;
}

/**
 * Devuelve el usuario autenticado.
 *
 * @return array<string, mixed>|null
 */
function auth_user(): ?array
{
    static $cachedUser = null;
    static $resolved = false;

    if ($resolved) {
        return $cachedUser;
    }

    $resolved = true;

    if (!auth_check()) {
        return null;
    }

    $userId = (int) $_SESSION[AUTH_SESSION_USER_ID];

    $cachedUser = db_fetch_one(
        'SELECT
            id,
            name,
            email,
            role,
            status,
            last_login_at,
            created_at,
            updated_at
         FROM users
         WHERE id = :id
         LIMIT 1',
        ['id' => $userId]
    );

    if (
        $cachedUser === null
        || ($cachedUser['status'] ?? '') !== 'active'
    ) {
        auth_logout(false);
        $cachedUser = null;
    }

    return $cachedUser;
}

/**
 * Exige una sesión válida.
 */
function auth_require_login(): void
{
    if (!auth_check() || auth_user() === null) {
        $_SESSION['auth_intended_url'] = (string) (
            $_SERVER['REQUEST_URI'] ?? auth_dashboard_url()
        );

        auth_redirect(auth_login_url());
    }
}

/**
 * Comprueba si el usuario tiene uno de los roles indicados.
 *
 * @param array<int, string> $roles
 */
function auth_has_role(array $roles): bool
{
    $user = auth_user();

    if ($user === null) {
        return false;
    }

    return in_array((string) $user['role'], $roles, true);
}

/**
 * Exige uno de los roles indicados.
 *
 * @param array<int, string> $roles
 */
function auth_require_role(array $roles): void
{
    auth_require_login();

    if (!auth_has_role($roles)) {
        http_response_code(403);

        echo 'No tienes permisos para acceder a esta sección.';
        exit;
    }
}

/**
 * Registra un intento de acceso.
 */
function auth_record_attempt(
    string $email,
    bool $wasSuccessful
): void {
    db_execute(
        'INSERT INTO login_attempts
            (email, ip_address, was_successful, attempted_at)
         VALUES
            (:email, :ip_address, :was_successful, NOW())',
        [
            'email' => $email !== '' ? $email : null,
            'ip_address' => auth_ip_address(),
            'was_successful' => $wasSuccessful ? 1 : 0,
        ]
    );
}

/**
 * Comprueba si el acceso está temporalmente limitado.
 */
function auth_is_rate_limited(string $email): bool
{
    $result = db_fetch_one(
        'SELECT COUNT(*) AS attempts
         FROM login_attempts
         WHERE was_successful = 0
           AND attempted_at >= DATE_SUB(
               NOW(),
               INTERVAL ' . AUTH_ATTEMPT_WINDOW_MINUTES . ' MINUTE
           )
           AND (
               ip_address = :ip_address
               OR email = :email
           )',
        [
            'ip_address' => auth_ip_address(),
            'email' => $email,
        ]
    );

    return (int) ($result['attempts'] ?? 0) >= AUTH_MAX_ATTEMPTS;
}

/**
 * Elimina intentos antiguos para evitar crecimiento indefinido.
 */
function auth_prune_attempts(): void
{
    try {
        db_execute(
            'DELETE FROM login_attempts
             WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
        );
    } catch (Throwable) {
        // La limpieza no debe interrumpir un intento de autenticación.
    }
}

/**
 * Intenta autenticar a un usuario.
 *
 * @return array{success:bool,message:string}
 */
function auth_attempt(string $email, string $password): array
{
    $email = auth_normalize_email($email);

    if (
        !filter_var($email, FILTER_VALIDATE_EMAIL)
        || $password === ''
    ) {
        return [
            'success' => false,
            'message' => 'Ingresa un correo y una contraseña válidos.',
        ];
    }

    auth_prune_attempts();

    if (auth_is_rate_limited($email)) {
        return [
            'success' => false,
            'message' => 'Demasiados intentos. Espera unos minutos antes de volver a intentar.',
        ];
    }

    $user = db_fetch_one(
        'SELECT
            id,
            name,
            email,
            password_hash,
            role,
            status
         FROM users
         WHERE email = :email
         LIMIT 1',
        ['email' => $email]
    );

    $valid = $user !== null
        && ($user['status'] ?? '') === 'active'
        && password_verify(
            $password,
            (string) ($user['password_hash'] ?? '')
        );

    auth_record_attempt($email, $valid);

    if (!$valid) {
        return [
            'success' => false,
            'message' => 'El correo o la contraseña no son correctos.',
        ];
    }

    if (
        password_needs_rehash(
            (string) $user['password_hash'],
            PASSWORD_DEFAULT
        )
    ) {
        $newHash = password_hash($password, PASSWORD_DEFAULT);

        if (is_string($newHash)) {
            db_execute(
                'UPDATE users
                 SET password_hash = :password_hash,
                     password_changed_at = NOW(),
                     updated_at = NOW()
                 WHERE id = :id',
                [
                    'password_hash' => $newHash,
                    'id' => (int) $user['id'],
                ]
            );
        }
    }

    session_regenerate_id(true);

    $_SESSION[AUTH_SESSION_USER_ID] = (int) $user['id'];
    $_SESSION[AUTH_SESSION_FINGERPRINT] = auth_session_fingerprint();
    $_SESSION[AUTH_SESSION_LAST_ACTIVITY] = time();
    $_SESSION[AUTH_SESSION_REGENERATED_AT] = time();

    db_execute(
        'UPDATE users
         SET last_login_at = NOW(),
             last_login_ip = :ip_address,
             updated_at = NOW()
         WHERE id = :id',
        [
            'ip_address' => auth_ip_address(),
            'id' => (int) $user['id'],
        ]
    );

    auth_log_activity(
        'login',
        'user',
        (int) $user['id'],
        'Inicio de sesión administrativo.'
    );

    return [
        'success' => true,
        'message' => 'Acceso concedido.',
    ];
}

/**
 * Cierra la sesión actual.
 */
function auth_logout(bool $redirect = true): void
{
    $userId = $_SESSION[AUTH_SESSION_USER_ID] ?? null;

    if (is_int($userId) || ctype_digit((string) $userId)) {
        try {
            auth_log_activity(
                'logout',
                'user',
                (int) $userId,
                'Cierre de sesión administrativo.'
            );
        } catch (Throwable) {
            // El cierre de sesión debe continuar aunque falle el registro.
        }
    }

    unset(
        $_SESSION[AUTH_SESSION_USER_ID],
        $_SESSION[AUTH_SESSION_FINGERPRINT],
        $_SESSION[AUTH_SESSION_LAST_ACTIVITY],
        $_SESSION[AUTH_SESSION_REGENERATED_AT],
        $_SESSION['auth_intended_url']
    );

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }

    if ($redirect) {
        auth_redirect(auth_login_url());
    }
}

/**
 * Registra actividad administrativa.
 */
function auth_log_activity(
    string $action,
    ?string $entityType = null,
    ?int $entityId = null,
    ?string $description = null,
    array $metadata = []
): void {
    $userId = $_SESSION[AUTH_SESSION_USER_ID] ?? null;

    db_execute(
        'INSERT INTO activity_logs
            (
                user_id,
                action,
                entity_type,
                entity_id,
                description,
                ip_address,
                user_agent,
                metadata_json,
                created_at
            )
         VALUES
            (
                :user_id,
                :action,
                :entity_type,
                :entity_id,
                :description,
                :ip_address,
                :user_agent,
                :metadata_json,
                NOW()
            )',
        [
            'user_id' => (
                is_int($userId)
                || ctype_digit((string) $userId)
            ) ? (int) $userId : null,
            'action' => mb_substr($action, 0, 120),
            'entity_type' => $entityType !== null
                ? mb_substr($entityType, 0, 120)
                : null,
            'entity_id' => $entityId,
            'description' => $description,
            'ip_address' => auth_ip_address(),
            'user_agent' => auth_user_agent(),
            'metadata_json' => $metadata !== []
                ? json_encode(
                    $metadata,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                )
                : null,
        ]
    );
}

/**
 * Genera o recupera un token CSRF para formularios administrativos.
 */
function auth_csrf_token(): string
{
    if (
        !isset($_SESSION['auth_csrf_token'])
        || !is_string($_SESSION['auth_csrf_token'])
        || strlen($_SESSION['auth_csrf_token']) < 32
    ) {
        $_SESSION['auth_csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['auth_csrf_token'];
}

/**
 * Valida un token CSRF.
 */
function auth_verify_csrf(string $token): bool
{
    $stored = $_SESSION['auth_csrf_token'] ?? '';

    return is_string($stored)
        && $stored !== ''
        && hash_equals($stored, $token);
}

/**
 * Devuelve y elimina la URL solicitada antes del acceso.
 */
function auth_pull_intended_url(): string
{
    $fallback = auth_dashboard_url();
    $intended = $_SESSION['auth_intended_url'] ?? $fallback;

    unset($_SESSION['auth_intended_url']);

    if (!is_string($intended) || $intended === '') {
        return $fallback;
    }

    $parts = parse_url($intended);

    if (
        $parts === false
        || isset($parts['scheme'])
        || isset($parts['host'])
    ) {
        return $fallback;
    }

    return $intended;
}
