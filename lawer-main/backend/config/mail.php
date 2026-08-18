<?php
return [
    'default' => env('MAIL_MAILER', 'smtp'),
    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME', env('MAIL_ENCRYPTION') === 'ssl' ? 'smtps' : null),
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', 'smtp.gmail.com'),
            'port' => env('MAIL_PORT', 465),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => 30,
            'local_domain' => env('MAIL_EHLO_DOMAIN'),
        ],
        'log' => ['transport' => 'log', 'channel' => env('MAIL_LOG_CHANNEL')],
    ],
    'from' => ['address' => env('MAIL_FROM_ADDRESS', 'zlegaleg@gmail.com'), 'name' => env('MAIL_FROM_NAME', 'Z Legal | Z draft')],
    'reply_to' => ['address' => env('MAIL_REPLY_TO_ADDRESS', 'zlegaleg@gmail.com'), 'name' => env('MAIL_REPLY_TO_NAME', 'Z Legal | Z draft')],
];
