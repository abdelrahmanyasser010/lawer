<?php
DB::statement("UPDATE platform_settings SET setting_value_json = '599' WHERE setting_key LIKE 'pricing.contracts.lawyer_assisted.%'");
echo "Prices updated successfully.\n";
