<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$files = [
    'rental' => 'rental.json',
    'apartment_sale' => 'apartment_sale.json',
    'freelancer' => 'freelancer.json'
];

foreach ($files as $slug => $file) {
    $path = database_path('template-definitions/' . $file);
    if (!file_exists($path)) {
        echo "Missing file $path\n";
        continue;
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    $template = Illuminate\Support\Facades\DB::table('contract_templates')
        ->where('slug', $data['slug'])
        ->first();
    if ($template) {
        Illuminate\Support\Facades\DB::table('template_versions')
            ->where('template_id', $template->id)
            ->where('version_number', $data['version'])
            ->update(['definition_json' => $raw]);
        echo "Updated template {$data['slug']} version {$data['version']}\n";
    } else {
        echo "Template {$data['slug']} not found in DB\n";
    }
}
