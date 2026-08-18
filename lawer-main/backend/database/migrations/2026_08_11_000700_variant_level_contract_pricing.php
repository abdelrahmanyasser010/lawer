<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $templates=DB::select("SELECT ct.slug,ct.price_egp,tv.definition_json FROM contract_templates ct JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.slug IN ('rental','apartment_sale','freelancer') AND tv.status='published'");
        foreach($templates as$template){
            $definition=is_string($template->definition_json)?json_decode($template->definition_json,true):(array)$template->definition_json;
            foreach($definition['variants']??[] as$variant){
                $variantKey=trim((string)($variant['key']??''));
                if($variantKey==='')continue;
                $selfKey="pricing.contracts.self_service.{$template->slug}.{$variantKey}";
                $lawyerKey="pricing.contracts.lawyer_assisted.{$template->slug}.{$variantKey}";
                $defaults=(array)($definition['variantPricing'][$variantKey]??[]);
                $selfDefault=(float)($defaults['selfServicePriceEgp']??$template->price_egp??0);
                $lawyerDefault=(float)($defaults['lawyerAssistedPriceEgp']??0);
                DB::statement('INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) VALUES (?,?::jsonb,FALSE) ON CONFLICT (setting_key) DO NOTHING',[$selfKey,json_encode($selfDefault)]);
                DB::statement('INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) VALUES (?,?::jsonb,FALSE) ON CONFLICT (setting_key) DO NOTHING',[$lawyerKey,json_encode($lawyerDefault)]);
            }
        }
    }

    public function down(): void
    {
        // Do not delete pricing history on rollback; these keys can already be referenced by customer snapshots.
    }
};
