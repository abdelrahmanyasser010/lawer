<?php
$settings = DB::select("SELECT setting_key, setting_value_json FROM platform_settings WHERE setting_key LIKE 'pricing.contracts.%' LIMIT 10");
echo json_encode($settings, JSON_PRETTY_PRINT);
