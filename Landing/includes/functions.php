<?php
declare(strict_types=1);

if (!function_exists('request_method')) {
    function request_method(): string
    {
        return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    }
}

if (!function_exists('request_ip')) {
    function request_ip(): string
    {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
            $raw = $_SERVER[$key] ?? '';

            if (!is_string($raw) || $raw === '') {
                continue;
            }

            $ip = trim(explode(',', $raw)[0]);

            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }

        return '0.0.0.0';
    }
}

if (!function_exists('setting')) {
    function setting(string $key, mixed $default = null): mixed
    {
        static $cache = [];

        if (array_key_exists($key, $cache)) {
            return $cache[$key];
        }

        if (!app_is_installed()) {
            return $default;
        }

        try {
            $row = db_fetch_one(
                'SELECT value, type FROM settings WHERE `key` = :key LIMIT 1',
                ['key' => $key]
            );

            if (!$row) {
                return $cache[$key] = $default;
            }

            $value = $row['value'];

            return $cache[$key] = match ($row['type']) {
                'integer' => (int) $value,
                'boolean' => in_array((string) $value, ['1', 'true', 'yes', 'on'], true),
                'json' => json_decode((string) $value, true) ?? $default,
                default => $value,
            };
        } catch (Throwable) {
            return $default;
        }
    }
}

if (!function_exists('public_sections')) {
    function public_sections(): array
    {
        if (!app_is_installed()) {
            return [];
        }

        return db_fetch_all(
            'SELECT cs.*, m.directory, m.filename, m.alt_text
             FROM content_sections cs
             LEFT JOIN media m ON m.id = cs.media_id
             WHERE cs.is_enabled = 1
             ORDER BY cs.sort_order, cs.id'
        );
    }
}

if (!function_exists('public_items')) {
    function public_items(int $sectionId): array
    {
        return db_fetch_all(
            'SELECT ci.*, m.directory, m.filename, m.alt_text
             FROM content_items ci
             LEFT JOIN media m ON m.id = ci.media_id
             WHERE ci.section_id = :section_id
               AND ci.is_enabled = 1
             ORDER BY ci.sort_order, ci.id',
            ['section_id' => $sectionId]
        );
    }
}

if (!function_exists('media_url_from_row')) {
    function media_url_from_row(array $row): ?string
    {
        if (empty($row['filename'])) {
            return null;
        }

        return upload_url(
            trim((string) ($row['directory'] ?? 'media'), '/')
            . '/'
            . $row['filename']
        );
    }
}

if (!function_exists('flash')) {
    function flash(string $key, ?string $value = null): ?string
    {
        if ($value !== null) {
            $_SESSION['_flash'][$key] = $value;
            return null;
        }

        $message = $_SESSION['_flash'][$key] ?? null;
        unset($_SESSION['_flash'][$key]);

        return is_string($message) ? $message : null;
    }
}

if (!function_exists('json_response')) {
    function json_response(array $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');

        echo json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        exit;
    }
}