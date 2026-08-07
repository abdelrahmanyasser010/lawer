<?php
$origins = array_values(array_filter([
    env('FRONTEND_URL'),
    env('DASHBOARD_URL'),
    env('CORS_EXTRA_ORIGIN'),
]));
return [
    'paths' => ['api/*', 'health', 'ready'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
    'exposed_headers' => ['X-Request-Id', 'Content-Disposition'],
    'max_age' => 600,
    'supports_credentials' => true,
];
