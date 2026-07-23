<?php

declare(strict_types=1);

/**
 * El Barrio Landing
 * Conexión centralizada a MySQL/MariaDB mediante PDO.
 */

if (!defined('EL_BARRIO_BOOTSTRAP_LOADED')) {
    require_once __DIR__ . '/bootstrap.php';
}

/**
 * Devuelve la configuración de base de datos generada por el instalador.
 *
 * @return array{
 *     host:string,
 *     port:int,
 *     database:string,
 *     username:string,
 *     password:string,
 *     charset:string,
 *     options?:array<int, mixed>
 * }
 */
function database_config(): array
{
    if (!app_is_installed()) {
        throw new RuntimeException('La aplicación todavía no está instalada.');
    }

    if (!is_file(DATABASE_CONFIG_FILE)) {
        throw new RuntimeException('No se encontró la configuración de base de datos.');
    }

    $config = require DATABASE_CONFIG_FILE;

    if (!is_array($config)) {
        throw new RuntimeException('La configuración de base de datos no es válida.');
    }

    $required = ['host', 'port', 'database', 'username', 'password', 'charset'];

    foreach ($required as $key) {
        if (!array_key_exists($key, $config)) {
            throw new RuntimeException(
                sprintf('Falta la opción de base de datos: %s.', $key)
            );
        }
    }

    return $config;
}

/**
 * Crea y reutiliza una única conexión PDO durante la solicitud actual.
 */
function db(): PDO
{
    static $connection = null;

    if ($connection instanceof PDO) {
        return $connection;
    }

    $config = database_config();

    $host = trim((string) $config['host']);
    $port = (int) $config['port'];
    $database = trim((string) $config['database']);
    $charset = trim((string) $config['charset']);

    if ($host === '' || $database === '' || $charset === '') {
        throw new RuntimeException('La configuración de base de datos está incompleta.');
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $host,
        $port,
        $database,
        $charset
    );

    $defaultOptions = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
        PDO::ATTR_TIMEOUT => 5,
    ];

    $customOptions = isset($config['options']) && is_array($config['options'])
        ? $config['options']
        : [];

    try {
        $connection = new PDO(
            $dsn,
            (string) $config['username'],
            (string) $config['password'],
            $customOptions + $defaultOptions
        );
    } catch (PDOException $exception) {
        throw new RuntimeException(
            'No fue posible conectar con la base de datos.',
            0,
            $exception
        );
    }

    return $connection;
}

/**
 * Ejecuta una consulta preparada y devuelve el statement resultante.
 *
 * @param array<string|int, mixed> $parameters
 */
function db_query(string $sql, array $parameters = []): PDOStatement
{
    $statement = db()->prepare($sql);
    $statement->execute($parameters);

    return $statement;
}

/**
 * Devuelve una sola fila o null cuando no existen resultados.
 *
 * @param array<string|int, mixed> $parameters
 * @return array<string, mixed>|null
 */
function db_fetch_one(string $sql, array $parameters = []): ?array
{
    $row = db_query($sql, $parameters)->fetch();

    return $row === false ? null : $row;
}

/**
 * Devuelve todas las filas de una consulta.
 *
 * @param array<string|int, mixed> $parameters
 * @return array<int, array<string, mixed>>
 */
function db_fetch_all(string $sql, array $parameters = []): array
{
    return db_query($sql, $parameters)->fetchAll();
}

/**
 * Ejecuta una operación de escritura y devuelve las filas afectadas.
 *
 * @param array<string|int, mixed> $parameters
 */
function db_execute(string $sql, array $parameters = []): int
{
    return db_query($sql, $parameters)->rowCount();
}

/**
 * Devuelve el último identificador autoincremental insertado.
 */
function db_last_insert_id(): string
{
    return db()->lastInsertId();
}

/**
 * Ejecuta una operación dentro de una transacción.
 *
 * La función recibida obtiene la conexión PDO activa. Si ocurre una
 * excepción, la transacción se revierte automáticamente.
 *
 * @template T
 * @param callable(PDO):T $callback
 * @return T
 */
function db_transaction(callable $callback): mixed
{
    $connection = db();

    if ($connection->inTransaction()) {
        return $callback($connection);
    }

    $connection->beginTransaction();

    try {
        $result = $callback($connection);
        $connection->commit();

        return $result;
    } catch (Throwable $exception) {
        if ($connection->inTransaction()) {
            $connection->rollBack();
        }

        throw $exception;
    }
}

/**
 * Comprueba que la conexión esté disponible.
 */
function db_is_available(): bool
{
    try {
        db()->query('SELECT 1');
        return true;
    } catch (Throwable) {
        return false;
    }
}
