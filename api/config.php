<?php
/**
 * Application configuration
 *
 * Override these values via environment variables in production.
 * For XAMPP local development the defaults below work out of the box.
 */

return [
    'db' => [
        'host'     => getenv('DB_HOST') ?: '127.0.0.1',
        'port'     => getenv('DB_PORT') ?: '3306',
        'name'     => getenv('DB_NAME') ?: 'telemed_db',
        'user'     => getenv('DB_USER') ?: 'root',
        'password' => getenv('DB_PASSWORD') ?: '',
        'charset'  => 'utf8mb4',
    ],

    'jwt' => [
        // CHANGE THIS IN PRODUCTION
        'secret'     => getenv('JWT_SECRET') ?: 'change-me-to-a-long-random-string-in-production-please-do-it',
        'algo'       => 'HS256',
        'issuer'     => 'telemed-platform',
        // 30-minute idle session per NFR-Security
        'ttl_seconds' => 1800,
    ],

    'cors' => [
        // Frontend origin during development
        'allowed_origins' => [
            'http://localhost',
            'http://127.0.0.1',
        ],
    ],

    'app' => [
        'name'    => 'Web-Based Telemedicine Platform',
        'version' => '1.0.0-prototype',
        'env'     => getenv('APP_ENV') ?: 'development',
    ],

    'chat_server' => [
        // Public URL of the Node.js Socket.IO server (frontend connects here)
        'url' => getenv('CHAT_URL') ?: 'http://localhost:3001',
    ],
];
