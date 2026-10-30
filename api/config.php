<?php
/**
 * Application configuration
 *
 * Override these values via environment variables in production.
 * Set the variables below to your PostgreSQL/Supabase credentials.
 */

// Load local development variables when Apache/XAMPP has not provided them.
// Render supplies real environment variables directly, which always take precedence.
$localEnvPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
if (is_file($localEnvPath)) {
    $lines = file($localEnvPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($key !== '' && getenv($key) === false) {
            putenv($key . '=' . trim($value, "\"'"));
        }
    }
}

$appEnv = getenv('APP_ENV') ?: 'development';
$dbDriver = getenv('DB_DRIVER') ?: ($appEnv === 'production' ? 'pgsql' : 'mysql');
$isMySql = $dbDriver === 'mysql';
$corsOrigins = getenv('CORS_ALLOWED_ORIGINS') ?: '';
if ($appEnv !== 'production') {
    $corsOrigins .= ($corsOrigins ? ',' : '') . 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174';
}
$jwtSecret = getenv('JWT_SECRET') ?: '';
if ($appEnv === 'production' && $jwtSecret === '') {
    throw new RuntimeException('JWT_SECRET must be configured in production.');
}

return [
    'db' => [
        'driver'   => $dbDriver,
        'host'     => $isMySql ? (getenv('MYSQL_HOST') ?: '127.0.0.1') : (getenv('DB_HOST') ?: '127.0.0.1'),
        'port'     => $isMySql ? (getenv('MYSQL_PORT') ?: '3306') : (getenv('DB_PORT') ?: '5432'),
        'name'     => $isMySql ? (getenv('MYSQL_DB') ?: 'telemed_db') : (getenv('DB_NAME') ?: 'postgres'),
        'user'     => $isMySql ? (getenv('MYSQL_USER') ?: 'root') : (getenv('DB_USER') ?: 'postgres'),
        'password' => $isMySql ? (getenv('MYSQL_PASSWORD') ?: '') : (getenv('DB_PASSWORD') ?: ''),
        'charset'  => 'utf8mb4',
        'sslmode'  => getenv('DB_SSLMODE') ?: 'disable',
    ],

    'jwt' => [
        // CHANGE THIS IN PRODUCTION
        'secret'     => $jwtSecret ?: 'change-me-to-a-long-random-string-in-production-please-do-it',
        'algo'       => 'HS256',
        'issuer'     => 'telemed-platform',
        // 30-minute idle session per NFR-Security
        'ttl_seconds' => 1800,
    ],

    'cors' => [
        'allowed_origins' => array_values(array_filter(array_map(
            'trim',
            explode(',', $corsOrigins)
        ))),
    ],

    'app' => [
        'name'    => 'Web-Based Telemedicine Platform',
        'version' => '1.0.0-prototype',
        'env'     => $appEnv,
    ],

    'mail' => [
        'from'       => getenv('MAIL_FROM') ?: 'no-reply@telemedzm.com',
        'from_name'  => getenv('MAIL_FROM_NAME') ?: 'Telemed ZM',
        'host'       => getenv('MAIL_HOST') ?: '',
        'port'       => (int)(getenv('MAIL_PORT') ?: 587),
        'username'   => getenv('MAIL_USERNAME') ?: '',
        'password'   => getenv('MAIL_PASSWORD') ?: '',
        'encryption' => strtolower(getenv('MAIL_ENCRYPTION') ?: 'tls'),
    ],
];
