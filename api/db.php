<?php
/**
 * Database connection (PDO singleton).
 * NFR-Reliability: PDO with ERRMODE_EXCEPTION + atomic transactions.
 * NFR-Data Integrity: prepared statements only.
 */

class DB
{
    private static ?PDO $pdo = null;

    public static function conn(): PDO
    {
        if (self::$pdo === null) {
            $config = require __DIR__ . '/config.php';
            $c = $config['db'];

            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $c['host'], $c['port'], $c['name'], $c['charset']
            );

            try {
                self::$pdo = new PDO($dsn, $c['user'], $c['password'], [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'error'   => 'Database connection failed',
                    'detail'  => $e->getMessage(),
                    'hint'    => 'Ensure XAMPP MySQL is running and database telemed_db exists.',
                ]);
                exit;
            }
        }
        return self::$pdo;
    }
}
