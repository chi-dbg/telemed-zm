<?php
/**
 * PostgreSQL connection (PDO singleton).
 * NFR-Reliability: PDO with ERRMODE_EXCEPTION + atomic transactions.
 * NFR-Data Integrity: prepared statements only.
 */

class DB
{
    private static ?PDO $pdo = null;

    public static function driver(): string
    {
        $config = require __DIR__ . '/config.php';
        return $config['db']['driver'];
    }

    public static function conn(): PDO
    {
        if (self::$pdo === null) {
            $config = require __DIR__ . '/config.php';
            $c = $config['db'];

            $dsn = $c['driver'] === 'mysql'
                ? sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $c['host'], $c['port'], $c['name'], $c['charset'])
                : sprintf('pgsql:host=%s;port=%s;dbname=%s;sslmode=%s', $c['host'], $c['port'], $c['name'], $c['sslmode']);

            try {
                self::$pdo = new PDO($dsn, $c['user'], $c['password'], [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                error_log('Database connection failed: ' . $e->getMessage());
                http_response_code(500);
                echo json_encode([
                    'error'   => 'Database connection failed',
                ]);
                exit;
            }
        }
        return self::$pdo;
    }
}
