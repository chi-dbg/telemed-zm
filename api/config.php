<?php
/**
 * Application configuration
 *
 * Override these values via environment variables in production.
 * Set the variables below to your PostgreSQL/Supabase credentials.
 */

$appEnv = getenv('APP_ENV') ?: 'development';
$jwtSecret = getenv('JWT_SECRET') ?: '';
if ($appEnv === 'production' && $jwtSecret === '') {
    throw new RuntimeException('JWT_SECRET must be configured in production.');
}

return [
    'db' => [
        'host'     => getenv('DB_HOST') ?: '127.0.0.1',
        'port'     => getenv('DB_PORT') ?: '5432',
        'name'     => getenv('DB_NAME') ?: 'postgres',
        'user'     => getenv('DB_USER') ?: 'postgres',
        'password' => getenv('DB_PASSWORD') ?: '',
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
            explode(',', getenv('CORS_ALLOWED_ORIGINS') ?: 'http://localhost:5173,http://127.0.0.1:5173')
        ))),
    ],

    'app' => [
        'name'    => 'Web-Based Telemedicine Platform',
        'version' => '1.0.0-prototype',
        'env'     => $appEnv,
    ],
];
