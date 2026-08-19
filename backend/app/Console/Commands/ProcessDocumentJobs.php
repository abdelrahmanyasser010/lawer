<?php
namespace App\Console\Commands;

use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

final class ProcessDocumentJobs extends Command
{
    protected $signature='zdraft:process-documents {--limit=3}';
    protected $description='Generate final contract and annex PDF files using WeasyPrint';
    public function __construct(private NotificationService $notifications){parent::__construct();}

    public function handle():int
    {
        $limit=max(1,min(50,(int)$this->option('limit')));$count=0;
        while($count<$limit){$job=$this->claim();if(!$job)break;try{$this->process($job);$this->info("Completed document job {$job->id}");}catch(\Throwable $e){$this->failJob($job,$e);$this->error("Document job {$job->id}: {$e->getMessage()}");}$count++;}
        $this->info("Processed {$count} document job(s).");return self::SUCCESS;
    }
    private function claim():?object{return DB::transaction(function(){$row=DB::selectOne("SELECT id,contract_id,contract_version_id,attempts FROM document_jobs WHERE job_type='generate_pdf' AND status IN ('pending','retry') AND available_at<=CURRENT_TIMESTAMP ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1");if(!$row)return null;DB::statement("UPDATE document_jobs SET status='processing',attempts=attempts+1,started_at=CURRENT_TIMESTAMP,error_message=NULL WHERE id=?",[$row->id]);DB::statement("UPDATE contracts SET pdf_status='processing',pdf_error_message=NULL WHERE id=?",[$row->contract_id]);$row->attempts=(int)$row->attempts+1;return$row;});}
    private function process(object $job):void
    {
        $c=DB::selectOne('SELECT c.id AS contract_id,cv.id AS contract_version_id,c.serial_number,c.user_id,c.client_user_id,c.issued_at,c.variant_key,c.selected_optional_clause_keys,c.field_values_json,cv.legal_clause_snapshot_json,cv.document_hash,tv.definition_json FROM contracts c JOIN contract_versions cv ON cv.id=? AND cv.contract_id=c.id JOIN template_versions tv ON tv.id=c.template_version_id WHERE c.id=? AND c.deleted_at IS NULL',[$job->contract_version_id,$job->contract_id]);if(!$c)throw new \RuntimeException('Contract/version/template context was not found');$definition=$this->json($c->definition_json);$fields=$this->json($c->field_values_json);$clauses=$this->list($c->legal_clause_snapshot_json);$optionalKeys=$this->list($c->selected_optional_clause_keys);$variant=collect($definition['variants']??[])->firstWhere('key',$c->variant_key);if(!$variant)throw new \RuntimeException("Template variant {$c->variant_key} is missing");$optionalKeys=$this->effectiveOptionalKeys($definition,$variant,$optionalKeys,$fields);
        $folder=$this->safe($c->serial_number).'/v'.$c->contract_version_id;$separate=[];foreach($definition['optionalClauses']??[]as$optional)if(in_array($optional['key']??'', $optionalKeys,true)&&($optional['outputMode']??null)==='separate_annex')foreach($optional['legalClauseKeys']??[]as$key)$separate[(string)$key]=true;
        $mainClauses=array_values(array_filter($clauses,fn($clause)=>!isset($separate[$clause['key']??''])));$mainKey=$folder.'/'.$this->safe($c->serial_number).'.pdf';$main=$this->generate($mainKey,$this->render($definition,$variant,$optionalKeys,$fields,$mainClauses,'main',null,$c,null,$clauses));$this->persist($c,'main','main',null,$variant['documentTitleAr']??$variant['nameAr'],$mainKey,$main);
        $annexNumber=0;foreach($optionalKeys as$key){$optional=collect($definition['optionalClauses']??[])->first(fn($x)=>($x['key']??null)===$key&&($x['outputMode']??null)==='separate_annex');if(!$optional)continue;$annexNumber++;$keys=array_fill_keys($optional['legalClauseKeys']??[],true);$annexClauses=array_values(array_filter($clauses,fn($clause)=>isset($keys[$clause['key']??''])));$annexKey=$folder.'/'.$this->safe($c->serial_number).'-'.$this->safe($key).'.pdf';$annex=$this->generate($annexKey,$this->render($definition,$variant,$optionalKeys,$fields,$annexClauses,'annex',$key,$c,$annexNumber));$this->persist($c,'annex:'.$key,'annex',$key,$optional['documentTitleAr']??$optional['nameAr'],$annexKey,$annex);}
        DB::transaction(function()use($job,$c,$main){DB::statement('UPDATE contract_versions SET pdf_path=? WHERE id=? AND contract_id=?',[$main['path'],$c->contract_version_id,$c->contract_id]);DB::statement("UPDATE contracts SET pdf_path=?,pdf_status='ready',pdf_error_message=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",[$main['path'],$c->contract_id]);DB::statement("UPDATE document_jobs SET status='completed',completed_at=CURRENT_TIMESTAMP,error_message=NULL WHERE id=?",[$job->id]);$this->notifications->notify((int)($c->client_user_id??$c->user_id),'contract_pdf_ready','عقدك النهائي جاهز للتحميل',"{$c->serial_number}: تم تجهيز ملف PDF النهائي والملاحق المختارة","/contract/{$c->contract_id}",['contractId'=>$c->contract_id,'contractVersionId'=>$c->contract_version_id]);});
    }
    private function render(array $definition,array $variant,array $optionalKeys,array $fields,array $clauses,string $kind,?string $optionalKey,object $c,?int $annexNumber,array $allClauses=[]):string
    {
        $steps=$this->documentSteps($definition,$variant,$optionalKeys,$kind,$optionalKey);
        $manualAnnex=false;$optional=null;
        if($kind==='annex'){$optional=collect($definition['optionalClauses']??[])->firstWhere('key',$optionalKey);$manualAnnex=(bool)($optional['manualFillAnnex']??false);}
        $sections=$manualAnnex?$this->buildBlankSections($steps):$this->buildSections($steps,$fields);
        $title=$variant['documentTitleAr']??$variant['nameAr']??'عقد';
        if($kind==='annex'){$title=$optional['documentTitleAr']??$optional['nameAr']??'ملحق';}
        $office=DB::selectOne("SELECT setting_value_json #>> '{}' AS value FROM platform_settings WHERE setting_key='office.display_name'");
        $logo=resource_path('zdraft-logo-transparent.png');$logoPath=is_file($logo)?'file://'.$logo:null;
        $issuedAt=!empty($fields['contract_date'])?date('d/m/Y',strtotime((string)$fields['contract_date'])):($c->issued_at?date('d/m/Y',strtotime((string)$c->issued_at)):date('d/m/Y'));
        $parties=$this->partyMeta((string)($definition['slug']??''),(string)($variant['key']??''),$fields);$witnesses=$this->witnessMeta((string)($variant['key']??''),$fields);
        $hashShort=!empty($c->document_hash)?substr((string)$c->document_hash,0,12):null;
        $annexRef=$kind==='annex'&&$annexNumber ? $c->serial_number.'-A'.$annexNumber : null;
        $annexes=[];
        if($kind==='main'){
            $counter=0;
            foreach($optionalKeys as $selectedKey){
                $selected=collect($definition['optionalClauses']??[])->first(fn($item)=>($item['key']??null)===$selectedKey&&($item['outputMode']??null)==='separate_annex');
                if(!$selected)continue;
                $counter++;
                $selectedSteps=$this->documentSteps($definition,$variant,$optionalKeys,'annex',$selectedKey);
                $selectedSections=($selected['manualFillAnnex']??false)?$this->buildBlankSections($selectedSteps):$this->buildSections($selectedSteps,$fields);
                $legalKeys=array_fill_keys($selected['legalClauseKeys']??[],true);
                $selectedClauses=array_values(array_filter($allClauses,fn($clause)=>isset($legalKeys[$clause['key']??''])));
                $annexes[]=[
                    'title'=>$selected['documentTitleAr']??$selected['nameAr']??'ملحق',
                    'annexRef'=>$c->serial_number.'-A'.$counter,
                    'manualFill'=>(bool)($selected['manualFillAnnex']??false),
                    'sections'=>$selectedSections,
                    'clauses'=>$selectedClauses,
                ];
            }
        }
        return view('pdf.contract',[
            'officeName'=>$office->value??'Z draft','logoPath'=>$logoPath,'title'=>$title,
            'serialNumber'=>$c->serial_number,'issuedAt'=>$issuedAt,'documentKind'=>$kind,'annexRef'=>$annexRef,
            'sections'=>$sections,'clauses'=>$clauses,'parties'=>$parties,'witnesses'=>$witnesses,'hashShort'=>$hashShort,'annexes'=>$annexes,'manualAnnex'=>$manualAnnex,
            'identitySignatureLayout'=>in_array((string)($variant['key']??''),['visual_identity_design','website_development','social_media_management'],true),
            'rentalSignatureLayout'=>match((string)($variant['key']??'')){'administrative_lease'=>'administrative','residential_lease','commercial_lease'=>'standard',default=>null},
            'saleSignatureLayout'=>in_array((string)($variant['key']??''),['preliminary_sale','registrable_sale','inherited_sale'],true),
        ])->render();
    }

    private function documentSteps(array $definition,array $variant,array $optionalKeys,string $kind,?string $optionalKey):array
    {
        if($kind==='annex'){
            $optional=collect($definition['optionalClauses']??[])->firstWhere('key',$optionalKey);
            return array_values($optional['insertedSteps']??[]);
        }
        $steps=array_values($variant['steps']??[]);
        foreach($optionalKeys as$key){
            $optional=collect($definition['optionalClauses']??[])->firstWhere('key',$key);
            if(!$optional||($optional['outputMode']??null)==='separate_annex')continue;
            $insert=array_values($optional['insertedSteps']??[]);if(!$insert)continue;
            $before=(string)($optional['insertBeforeStepKey']??'');$index=null;
            foreach($steps as$i=>$step)if(($step['key']??null)===$before){$index=$i;break;}
            if($index===null)$steps=array_merge($steps,$insert);else array_splice($steps,$index,0,$insert);
        }
        return $steps;
    }

    private function buildSections(array $steps,array $fields):array
    {
        $sections=[];
        foreach($steps as$step){
            if(!$this->evaluateCondition($step['visibleWhen']??null,$fields))continue;
            $items=[];$repeaters=[];
            foreach($step['fields']??[] as$field){
                if(($field['printInDocument']??true)===false||!$this->evaluateCondition($field['visibleWhen']??null,$fields))continue;
                $key=(string)($field['key']??'');$type=(string)($field['type']??'text');$value=$fields[$key]??null;
                if($type==='attachment'||$this->empty($value))continue;
                if($type==='checkbox'&&$value!==true)continue;
                if($type==='repeater'&&is_array($value)){
                    $columns=[];foreach($field['columns']??[]as$column)$columns[]=['key'=>(string)($column['key']??''),'label'=>$column['labelAr']??$column['key'],'options'=>$column['options']??[]];
                    $rows=[];foreach(array_values($value)as$row){if(!is_array($row))continue;$rendered=[];foreach($columns as$column)$rendered[]=$this->displayOption($row[$column['key']]??'', $column['options']);$rows[]=$rendered;}
                    if($rows)$repeaters[]=['title'=>$field['labelAr']??$key,'columns'=>$columns,'rows'=>$rows];
                    continue;
                }
                $items[]=['label'=>$this->fieldLabel($field,$fields),'value'=>$this->display($value,$field),'ltr'=>$this->isLtrField($key,$type)];
            }
            if($items||$repeaters){$stepKey=(string)($step['key']??'');$presentation=$this->isPartyStep($stepKey)?'party':'grid';$sections[]=['title'=>$step['titleAr']??'بيانات العقد','items'=>$items,'repeaters'=>$repeaters,'presentation'=>$presentation];}
        }
        return $sections;
    }


    private function buildBlankSections(array $steps):array
    {
        $sections=[];
        foreach($steps as$step){
            $items=[];$repeaters=[];
            foreach($step['fields']??[] as$field){
                $type=(string)($field['type']??'text');if($type==='attachment')continue;
                if($type==='repeater'){
                    $columns=[];foreach($field['columns']??[]as$column)$columns[]=['key'=>(string)($column['key']??''),'label'=>$column['labelAr']??$column['key'],'options'=>$column['options']??[],'type'=>$column['type']??'text'];
                    $labels=array_values($field['blankRowLabels']??[]);$rowCount=max(1,min(20,(int)($field['blankRows']??(count($labels)?:3))));$rows=[];
                    for($i=0;$i<$rowCount;$i++){
                        $row=[];
                        foreach($columns as$columnIndex=>$column){
                            if($columnIndex===0&&isset($labels[$i])){$row[]=(string)$labels[$i];continue;}
                            if(in_array($column['type'],['select','radio'],true)&&!empty($column['options'])){
                                $row[]=implode('   ',array_map(fn($option)=>'□ '.(string)($option['labelAr']??$option['value']??''),$column['options']));
                            }else{$row[]='................................';}
                        }
                        $rows[]=$row;
                    }
                    if($columns)$repeaters[]=['title'=>$field['labelAr']??'بيانات','columns'=>$columns,'rows'=>$rows];
                    continue;
                }
                $blank='........................................................';
                if(($field['manualCheckbox']??false)===true)$blank='□   ........................................................';
                elseif($type==='checkbox')$blank='□';
                elseif(in_array($type,['select','radio'],true)&&!empty($field['options']))$blank=implode('   ',array_map(fn($option)=>'□ '.(string)($option['labelAr']??$option['value']??''),$field['options']));
                $items[]=['label'=>$field['labelAr']??($field['key']??'بيان'),'value'=>$blank,'ltr'=>false];
            }
            if($items||$repeaters)$sections[]=['title'=>$step['titleAr']??'بيانات الملحق','items'=>$items,'repeaters'=>$repeaters,'presentation'=>'grid'];
        }
        return$sections;
    }

    private function fieldLabel(array $field,array $fields):string
    {
        $key=(string)($field['key']??'');
        if(str_ends_with($key,'_national_id')){
            $typeKey=preg_replace('/_national_id$/','_identity_document_type',$key);
            $selectedType=trim((string)($fields[$typeKey]??''));
            if($selectedType==='passport')return'رقم جواز السفر';
            if($selectedType==='national_id')return'الرقم القومي';
            $natKey=preg_replace('/_national_id$/','_nationality',$key);
            $nat=mb_strtolower(trim((string)($fields[$natKey]??'')));
            if(in_array($nat,['مصري','مصرية','مصري الجنسية','egyptian'],true))return'الرقم القومي';
            if($nat!=='')return'رقم جواز السفر';
            return'رقم مستند إثبات الهوية';
        }
        return(string)($field['labelAr']??($key?:'بيان'));
    }

    private function identityDocumentLabel(string $prefix,array $fields):string
    {
        $selectedType=trim((string)($fields[$prefix.'_identity_document_type']??''));
        if($selectedType==='passport')return'رقم جواز السفر';
        if($selectedType==='national_id')return'الرقم القومي';
        $nat=mb_strtolower(trim((string)($fields[$prefix.'_nationality']??'')));
        if(in_array($nat,['مصري','مصرية','مصري الجنسية','egyptian'],true))return'الرقم القومي';
        if($nat!=='')return'رقم جواز السفر';
        return'رقم مستند إثبات الهوية';
    }

    private function isPartyStep(string $stepKey):bool
    {
        return in_array($stepKey,['rental_landlord','rental_tenant','sale_seller','sale_buyer'],true)
            ||str_ends_with($stepKey,'_client_party')||str_ends_with($stepKey,'_provider_party');
    }

    private function partyMeta(string $slug,string $variantKey,array $fields):array
    {
        if($slug==='rental')return[
            ['label'=>'الطرف الأول – المؤجر','name'=>(string)($fields['landlord_name']??''),'capacity'=>(string)(($fields['landlord_party_type']??'individual')==='company'?($fields['landlord_representative_capacity']??''):'المؤجر'),'nationalId'=>(string)($fields['landlord_national_id']??''),'identityLabel'=>$this->identityDocumentLabel('landlord',$fields)],
            ['label'=>'الطرف الثاني – المستأجر','name'=>(string)($fields['tenant_name']??''),'capacity'=>(string)(($fields['tenant_party_type']??'individual')==='company'?($fields['tenant_representative_capacity']??''):'المستأجر'),'nationalId'=>(string)($fields['tenant_national_id']??''),'identityLabel'=>$this->identityDocumentLabel('tenant',$fields)],
        ];
        if($slug==='apartment_sale')return[
            ['label'=>'الطرف الأول – البائع','name'=>(string)($fields['seller_name']??''),'capacity'=>(string)(($fields['seller_party_type']??'individual')==='company'?($fields['seller_representative_capacity']??''):'البائع'),'nationalId'=>(string)($fields['seller_national_id']??''),'identityLabel'=>$this->identityDocumentLabel('seller',$fields)],
            ['label'=>'الطرف الثاني – المشتري','name'=>(string)($fields['buyer_name']??''),'capacity'=>(string)(($fields['buyer_party_type']??'individual')==='company'?($fields['buyer_representative_capacity']??''):'المشتري'),'nationalId'=>(string)($fields['buyer_national_id']??''),'identityLabel'=>$this->identityDocumentLabel('buyer',$fields)],
        ];
        $prefix=match($variantKey){'visual_identity_design'=>'visual','website_development'=>'website','social_media_management'=>'social',default=>'website'};
        $second=match($variantKey){'visual_identity_design'=>'المصمم','website_development'=>'مقدم الخدمة / المطور','social_media_management'=>'مقدم الخدمة',default=>'مقدم الخدمة'};
        return[
            ['label'=>'الطرف الأول – العميل','name'=>(string)($fields[$prefix.'_client_name']??''),'capacity'=>(string)(($fields[$prefix.'_client_party_type']??'individual')==='company'?($fields[$prefix.'_client_representative_capacity']??''):'العميل'),'nationalId'=>(string)($fields[$prefix.'_client_national_id']??''),'identityLabel'=>$this->identityDocumentLabel($prefix.'_client',$fields)],
            ['label'=>'الطرف الثاني – '.$second,'name'=>(string)($fields[$prefix.'_provider_name']??''),'capacity'=>(string)(($fields[$prefix.'_provider_party_type']??'individual')==='company'?($fields[$prefix.'_provider_representative_capacity']??''):$second),'nationalId'=>(string)($fields[$prefix.'_provider_national_id']??''),'identityLabel'=>$this->identityDocumentLabel($prefix.'_provider',$fields)],
        ];
    }


    private function witnessMeta(string $variantKey,array $fields):array
    {
        $prefix=match($variantKey){'visual_identity_design'=>'visual','website_development'=>'website','social_media_management'=>'social','residential_lease'=>'rental','commercial_lease'=>'rental','administrative_lease'=>'rental','preliminary_sale','registrable_sale','inherited_sale'=>'sale',default=>null};
        if($prefix===null)return[];
        $items=[];
        foreach([1,2] as$number){
            if(($fields[$prefix.'_witness_'.$number.'_enabled']??false)!==true)continue;
            $items[]=[
                'label'=>'الشاهد '.($number===1?'الأول':'الثاني'),
                'name'=>(string)($fields[$prefix.'_witness_'.$number.'_name']??''),
                'nationalId'=>(string)($fields[$prefix.'_witness_'.$number.'_national_id']??''),
            ];
        }
        return$items;
    }

    private function effectiveOptionalKeys(array $definition,array $variant,array $selected,array $fields):array
    {
        // Every annex is optional: only keys explicitly selected by the user are rendered.
        return array_values(array_unique(array_map('strval',$selected)));
    }

    private function evaluateCondition(?array $condition,array $fields):bool
    {
        if(!$condition)return true;
        if(isset($condition['all'])&&is_array($condition['all'])){foreach($condition['all'] as$item)if(!$this->evaluateCondition(is_array($item)?$item:null,$fields))return false;return count($condition['all'])>0;}
        if(isset($condition['any'])&&is_array($condition['any'])){foreach($condition['any'] as$item)if($this->evaluateCondition(is_array($item)?$item:null,$fields))return true;return false;}
        if(isset($condition['not'])&&is_array($condition['not']))return!$this->evaluateCondition($condition['not'],$fields);
        $current=$fields[(string)($condition['fieldKey']??'')]??null;if(is_array($current))$current=null;
        return match($condition['operator']??null){
            'equals'=>$current===($condition['value']??null),
            'not_equals'=>$current!==($condition['value']??null),
            'truthy'=>(bool)$current,
            'falsy'=>!(bool)$current,
            'includes'=>str_contains((string)($current??''),(string)($condition['value']??'')),
            default=>true,
        };
    }

    private function isLtrField(string $key,string $type):bool
    {
        return in_array($type,['number','money','date'],true)||preg_match('/(?:phone|email|national_id|passport|register|tax|meter|serial|url|link|iban|account|code|number)$/',$key)===1;
    }

    private function displayOption(mixed $value,array $options):string
    {
        $option=collect($options)->firstWhere('value',$value);
        if($option)return(string)$option['labelAr'];
        $raw=(string)$value;
        if($options&&preg_match('/^[a-z][a-z0-9_]*$/i',$raw)===1)return'قيمة غير معتمدة — يرجى إعادة الاختيار';
        return$raw;
    }

    private function generate(string $key,string $html):array
    {
        $path=Storage::disk('contracts')->path($key);if(!is_dir(dirname($path))&&!mkdir(dirname($path),0770,true)&&!is_dir(dirname($path)))throw new \RuntimeException('Cannot create PDF directory');$temp=tempnam(storage_path('framework'),'zdraft-html-');if($temp===false)throw new \RuntimeException('Cannot create temporary HTML');file_put_contents($temp,$html);try{$process=new Process([config('zdraft.weasyprint_binary'),$temp,$path]);$process->setTimeout(config('zdraft.pdf_timeout_seconds'));$process->run();if(!$process->isSuccessful())throw new \RuntimeException('WeasyPrint failed: '.$process->getErrorOutput().' '.$process->getOutput());if(!is_file($path)||filesize($path)<500)throw new \RuntimeException('Generated PDF is missing or invalid');return['path'=>$path,'sha256'=>hash_file('sha256',$path),'sizeBytes'=>filesize($path)];}finally{@unlink($temp);}
    }
    private function persist(object $c,string $fileKey,string $type,?string $optional,string $title,string $storageKey,array $file):void{DB::statement("INSERT INTO contract_document_files(contract_id,contract_version_id,file_key,document_type,optional_clause_key,title_ar,storage_path,storage_driver,storage_key,sha256,file_size_bytes) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (contract_version_id,file_key) DO UPDATE SET document_type=EXCLUDED.document_type,optional_clause_key=EXCLUDED.optional_clause_key,title_ar=EXCLUDED.title_ar,storage_path=EXCLUDED.storage_path,storage_driver=EXCLUDED.storage_driver,storage_key=EXCLUDED.storage_key,sha256=EXCLUDED.sha256,file_size_bytes=EXCLUDED.file_size_bytes,updated_at=CURRENT_TIMESTAMP",[$c->contract_id,$c->contract_version_id,$fileKey,$type,$optional,$title,$file['path'],'local',$storageKey,$file['sha256'],$file['sizeBytes']]);}
    private function failJob(object $job,\Throwable $e):void{$message=mb_substr($e->getMessage()."\n".$e->getTraceAsString(),0,5000);$terminal=(int)$job->attempts>=5;$delay=min(30,2**max(1,(int)$job->attempts));DB::transaction(function()use($job,$message,$terminal,$delay){DB::statement("UPDATE document_jobs SET status=?,error_message=?,available_at=CURRENT_TIMESTAMP+(?::text || ' minutes')::interval WHERE id=?",[$terminal?'failed':'retry',$message,$delay,$job->id]);DB::statement('UPDATE contracts SET pdf_status=?,pdf_error_message=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[$terminal?'failed':'queued',mb_substr($message,0,2000),$job->contract_id]);});}
    private function display(mixed $value,array $field):string
    {
        if(is_bool($value))return$value?'نعم':'لا';
        if(is_array($value)){
            if(array_is_list($value)&&isset($field['options'])){
                $labels=[];
                foreach($value as$v){
                    $o=collect($field['options'])->firstWhere('value',$v);$raw=(string)$v;
                    $labels[]=$o['labelAr']??(preg_match('/^[a-z][a-z0-9_]*$/i',$raw)===1?'قيمة غير معتمدة — يرجى إعادة الاختيار':$raw);
                }
                return implode('، ',$labels);
            }
            return collect($value)->map(function($row,$i){
                if(!is_array($row))return(string)$row;
                return($i+1).') '.implode(' | ',array_map(fn($k,$v)=>$k.': '.$v,array_keys($row),$row));
            })->implode("\n");
        }
        $option=collect($field['options']??[])->firstWhere('value',$value);
        if($option)return(string)$option['labelAr'];
        $raw=(string)$value;
        if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$raw)===1)return substr($raw,8,2).'/'.substr($raw,5,2).'/'.substr($raw,0,4);
        if(!empty($field['options'])&&preg_match('/^[a-z][a-z0-9_]*$/i',$raw)===1)return'قيمة غير معتمدة — يرجى إعادة الاختيار';
        return$raw;
    }
    private function json(mixed $v):array{if(is_array($v))return$v;if(is_object($v))return(array)$v;if(is_string($v))return json_decode($v,true)?:[];return[];}private function list(mixed $v):array{return array_values($this->json($v));}private function empty(mixed$v):bool{return$v===null||$v===''||(is_array($v)&&!count($v));}private function safe(string$v):string{return trim(preg_replace('/[^A-Za-z0-9._-]+/','-',$v),'-')?:'document';}
}
