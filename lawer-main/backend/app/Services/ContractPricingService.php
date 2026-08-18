<?php
namespace App\Services;

use Illuminate\Support\Facades\DB;

final class ContractPricingService
{
    public function selfKey(string $slug,string $variantKey):string{return "pricing.contracts.self_service.{$slug}.{$variantKey}";}
    public function lawyerKey(string $slug,string $variantKey):string{return "pricing.contracts.lawyer_assisted.{$slug}.{$variantKey}";}

    /** @return array<string,array{selfServicePriceEgp:float,lawyerAssistedPriceEgp:float}> */
    public function forDefinition(string $slug,array $definition):array
    {
        $variants=array_values($definition['variants']??[]);$keys=[];
        foreach($variants as$v){$key=(string)($v['key']??'');if($key==='')continue;$keys[]=$this->selfKey($slug,$key);$keys[]=$this->lawyerKey($slug,$key);}
        $settings=[];
        if($keys){$rows=DB::table('platform_settings')->selectRaw('setting_key AS key,setting_value_json AS value')->where('is_secret',false)->whereIn('setting_key',$keys)->get();foreach($rows as$row){$value=is_string($row->value)?json_decode($row->value,true):$row->value;$settings[$row->key]=(float)($value??0);}}
        $result=[];
        foreach($variants as$v){$key=(string)($v['key']??'');if($key==='')continue;$result[$key]=['selfServicePriceEgp'=>(float)($settings[$this->selfKey($slug,$key)]??0),'lawyerAssistedPriceEgp'=>(float)($settings[$this->lawyerKey($slug,$key)]??0)];}
        return$result;
    }

    public function selfPrice(string $slug,string $variantKey,array $definition):float{return(float)($this->forDefinition($slug,$definition)[$variantKey]['selfServicePriceEgp']??0);}
    public function lawyerPrice(string $slug,string $variantKey,array $definition):float{return(float)($this->forDefinition($slug,$definition)[$variantKey]['lawyerAssistedPriceEgp']??0);}

    /** @param array<int,array{variantKey:string,selfServicePriceEgp:float|int,lawyerAssistedPriceEgp:float|int}> $rows */
    public function save(string $slug,array $definition,array $rows,int $actorId):void
    {
        $allowed=array_fill_keys(array_values(array_filter(array_map(fn($v)=>(string)($v['key']??''),$definition['variants']??[]))),true);
        foreach($rows as$row){
            $variantKey=trim((string)($row['variantKey']??''));
            if($variantKey===''||!isset($allowed[$variantKey]))continue;
            foreach([
                [$this->selfKey($slug,$variantKey),(float)($row['selfServicePriceEgp']??0)],
                [$this->lawyerKey($slug,$variantKey),(float)($row['lawyerAssistedPriceEgp']??0)],
            ]as[$key,$value]){
                DB::statement('INSERT INTO platform_settings (setting_key,setting_value_json,is_secret,updated_by) VALUES (?,?::jsonb,FALSE,?) ON CONFLICT (setting_key) DO UPDATE SET setting_value_json=EXCLUDED.setting_value_json,is_secret=FALSE,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP',[$key,json_encode($value,JSON_UNESCAPED_UNICODE),$actorId]);
            }
        }
    }
}
