<?php
return [
    'default' => env('FILESYSTEM_DISK', 'private'),
    'disks' => [
        'private' => [
            'driver' => 'local',
            'root' => env('PRIVATE_STORAGE_ROOT', storage_path('app/private')),
            'serve' => false,
            'throw' => true,
        ],
        'contracts' => [
            'driver' => 'local',
            'root' => env('PDF_STORAGE_ROOT', storage_path('app/contracts')),
            'serve' => false,
            'throw' => true,
        ],
        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => true,
        ],
    ],
];
