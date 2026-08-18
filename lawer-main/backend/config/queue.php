<?php
return [
    'default' => env('QUEUE_CONNECTION', 'sync'),
    'connections' => [
        'sync' => ['driver' => 'sync'],
        'database' => ['driver' => 'database', 'connection' => env('DB_QUEUE_CONNECTION'), 'table' => env('DB_QUEUE_TABLE', 'jobs'), 'queue' => env('DB_QUEUE', 'default'), 'retry_after' => (int) env('DB_QUEUE_RETRY_AFTER', 180), 'after_commit' => true],
        'redis' => ['driver' => 'redis', 'connection' => env('REDIS_QUEUE_CONNECTION', 'default'), 'queue' => env('REDIS_QUEUE', 'default'), 'retry_after' => (int) env('REDIS_QUEUE_RETRY_AFTER', 180), 'block_for' => 5, 'after_commit' => true],
    ],
    'failed' => ['driver' => env('QUEUE_FAILED_DRIVER', 'database-uuids'), 'database' => env('DB_CONNECTION', 'pgsql'), 'table' => 'failed_jobs'],
];
