<?php
namespace App\Services;

use App\Exceptions\ApiException;

final class TemplateEngineService
{
    /** @return array{variant:array,steps:array,activeClauseKeys:array} */
    public function resolve(array $definition, string $variantKey, array $optionalKeys, array $fieldValues): array
    {
        $variant = collect($definition['variants'] ?? [])->firstWhere('key', $variantKey);
        if (!$variant) throw new ApiException(400, 'نوع العقد المختار غير صالح', 'INVALID_VARIANT');
        $allowed = array_values(array_unique(array_map('strval', $variant['allowedOptionalClauseKeys'] ?? [])));
        $optionalKeys = $this->effectiveOptionalKeys($definition, $variant, $optionalKeys, $fieldValues);
        $optionalLibrary = collect($definition['optionalClauses'] ?? [])->keyBy('key');
        $invalid = [];
        foreach ($optionalKeys as $key) {
            $clause = $optionalLibrary->get((string)$key);
            if (!$clause || !in_array((string)$key, $allowed, true) || !in_array($variantKey, $clause['applicableVariantKeys'] ?? [], true)) $invalid[] = (string)$key;
        }
        if ($invalid) throw new ApiException(400, 'الإضافات المختارة غير مسموحة لهذا النوع', 'INVALID_OPTIONAL_CLAUSE', $invalid);

        $steps = array_values($variant['steps'] ?? []);
        $active = array_fill_keys(array_map('strval', $variant['requiredClauseKeys'] ?? []), true);
        foreach ($optionalKeys as $key) {
            $clause = $optionalLibrary->get((string)$key);
            if (!$clause) continue;
            if (!(bool)($clause['manualFillAnnex'] ?? false)) {
                $insert = array_values($clause['insertedSteps'] ?? []);
                $before = (string)($clause['insertBeforeStepKey'] ?? '');
                $index = null;
                foreach ($steps as $i => $step) if (($step['key'] ?? null) === $before) { $index = $i; break; }
                if ($index === null) $steps = array_merge($steps, $insert); else array_splice($steps, $index, 0, $insert);
            }
            foreach ($clause['legalClauseKeys'] ?? [] as $clauseKey) $active[(string)$clauseKey] = true;
        }
        $resolved = [];
        foreach ($steps as $step) {
            if (!$this->evaluate($step['visibleWhen'] ?? null, $fieldValues)) continue;
            $visibleFields = array_values(array_filter($step['fields'] ?? [], fn(array $field) => $this->evaluate($field['visibleWhen'] ?? null, $fieldValues)));
            $step['fields'] = array_map(function(array $field) use ($fieldValues) {
                if (isset($field['requiredWhen']) && $this->evaluate($field['requiredWhen'], $fieldValues)) $field['required'] = true;
                return $field;
            }, $visibleFields);
            $resolved[] = $step;
        }
        return ['variant'=>$variant,'steps'=>$resolved,'activeClauseKeys'=>array_keys($active)];
    }

    public function evaluate(?array $condition, array $fieldValues): bool
    {
        if (!$condition) return true;
        if (isset($condition['all']) && is_array($condition['all'])) {
            if (count($condition['all']) === 0) return false;
            foreach ($condition['all'] as $item) if (!$this->evaluate(is_array($item) ? $item : null, $fieldValues)) return false;
            return true;
        }
        if (isset($condition['any']) && is_array($condition['any'])) {
            foreach ($condition['any'] as $item) if ($this->evaluate(is_array($item) ? $item : null, $fieldValues)) return true;
            return false;
        }
        if (isset($condition['not']) && is_array($condition['not'])) return !$this->evaluate($condition['not'], $fieldValues);
        $current = $fieldValues[(string)($condition['fieldKey'] ?? '')] ?? null;
        if (is_array($current)) $current = null;
        return match ($condition['operator'] ?? null) {
            'equals' => $current === ($condition['value'] ?? null),
            'not_equals' => $current !== ($condition['value'] ?? null),
            'truthy' => (bool)$current,
            'falsy' => !(bool)$current,
            'includes' => str_contains((string)($current ?? ''), (string)($condition['value'] ?? '')),
            default => true,
        };
    }

    /** @return array{steps:array,issues:array} */
    public function validateDraft(array $definition, string $variantKey, array $optionalKeys, array $fieldValues, array $attachmentRefs = []): array
    {
        $resolved = $this->resolve($definition, $variantKey, $optionalKeys, $fieldValues);
        $issues = [];
        foreach ($resolved['steps'] as $step) {
            foreach ($step['fields'] ?? [] as $field) {
                $key = (string)($field['key'] ?? '');
                $value = ($field['type'] ?? null) === 'attachment' ? ($attachmentRefs[$key] ?? ($fieldValues[$key] ?? null)) : ($fieldValues[$key] ?? null);
                if (($field['type'] ?? null) === 'repeater') {
                    $rows = is_array($value) ? array_values($value) : [];
                    $minRows = (int)($field['minRows'] ?? (($field['required'] ?? false) ? 1 : 0));
                    if (count($rows) < $minRows) $issues[] = (string)($field['labelAr'] ?? $key);
                    foreach ($rows as $i => $row) {
                        if (!is_array($row)) continue;
                        foreach ($field['columns'] ?? [] as $column) {
                            if (!empty($column['visibleWhen']) && !$this->evaluate(is_array($column['visibleWhen']) ? $column['visibleWhen'] : null, $row)) continue;
                            $required = (bool)($column['required'] ?? false) || (!empty($column['requiredWhen']) && $this->evaluate(is_array($column['requiredWhen']) ? $column['requiredWhen'] : null, $row));
                            if ($required && $this->emptyValue($row[$column['key']] ?? null)) {
                                $issues[] = sprintf('%s — %s في العنصر رقم %d', $field['labelAr'] ?? $key, $column['labelAr'] ?? $column['key'], $i+1);
                            }
                        }
                    }
                    continue;
                }
                $label = (string)($field['labelAr'] ?? $key);
                if (($field['required'] ?? false) && (($field['type'] ?? null) === 'checkbox' ? $value !== true : $this->emptyValue($value))) { $issues[] = $label; continue; }
                if ($this->emptyValue($value)) continue;
                $validation = $field['validation'] ?? [];
                if (in_array($field['type'] ?? null, ['number','money'], true)) {
                    if (!is_numeric($value)) { $issues[] = "$label — قيمة رقمية غير صحيحة"; continue; }
                    $numeric = (float)$value;
                    if (isset($validation['min']) && $numeric < (float)$validation['min']) $issues[] = "$label — الحد الأدنى {$validation['min']}";
                    if (isset($validation['max']) && $numeric > (float)$validation['max']) $issues[] = "$label — الحد الأقصى {$validation['max']}";
                }
                $text = (string)$value;
                if (isset($validation['minLength']) && mb_strlen($text) < (int)$validation['minLength']) $issues[] = "$label — أقصر من المطلوب";
                if (isset($validation['maxLength']) && mb_strlen($text) > (int)$validation['maxLength']) $issues[] = "$label — أطول من المسموح";
                if (isset($validation['expectedDigits']) && strlen(preg_replace('/\D+/', '', $text)) !== (int)$validation['expectedDigits']) $issues[] = "$label — مطلوب {$validation['expectedDigits']} رقمًا";
                if (!empty($validation['pattern'])) {
                    set_error_handler(static fn()=>true);
                    $matched = @preg_match('~'.$validation['pattern'].'~u', $text);
                    restore_error_handler();
                    if ($matched !== 1) $issues[] = "$label — التنسيق غير صحيح";
                }
            }
        }
        if (($definition['slug'] ?? null) === 'apartment_sale' && ($fieldValues['sale_payment_plan'] ?? null) !== 'installments' && in_array('sale_installment_schedule', array_map('strval', $optionalKeys), true)) {
            $issues[] = 'ملحق جدول الأقساط يُستخدم فقط عند اختيار السداد بالتقسيط';
        }
        if (($definition['slug'] ?? null) === 'apartment_sale' && ($fieldValues['sale_payment_plan'] ?? null) === 'installments') {
            $total = (float)($fieldValues['sale_total_price'] ?? 0);
            $down = (float)($fieldValues['sale_down_payment'] ?? 0);
            $remaining = (float)($fieldValues['sale_remaining_amount'] ?? 0);
            if ($total > 0 && abs($total - ($down + $remaining)) > 0.01) {
                $issues[] = 'إجمالي الثمن يجب أن يساوي الدفعة المقدمة + باقي الثمن';
            }
        }
        foreach ($resolved['steps'] as $step) {
            foreach ($step['fields'] ?? [] as $field) {
                $fKey = (string)($field['key'] ?? '');
                if (!str_ends_with($fKey, '_national_id')) continue;

                $typeKey = preg_replace('/_national_id$/', '_identity_document_type', $fKey);
                $natKey = preg_replace('/_national_id$/', '_nationality', $fKey);
                $selectedType = trim((string)($fieldValues[$typeKey] ?? ''));
                $natVal = mb_strtolower(trim((string)($fieldValues[$natKey] ?? '')));
                $idVal = trim((string)($fieldValues[$fKey] ?? ''));
                if ($idVal === '') continue;

                $legacyEgyptian = in_array($natVal, ['مصري', 'egyptian', 'مصرية', 'مصري الجنسية'], true);
                $effectiveType = $selectedType !== '' ? $selectedType : ($natVal !== '' ? ($legacyEgyptian ? 'national_id' : 'passport') : '');
                $digitsOnly = preg_replace('/\D/', '', $idVal);
                if ($effectiveType === 'national_id' && (strlen($digitsOnly) !== 14 || $digitsOnly !== $idVal)) {
                    $issues[] = 'الرقم القومي — مطلوب 14 رقمًا بدون مسافات أو حروف';
                } elseif ($effectiveType === 'passport' && mb_strlen($idVal) < 5) {
                    $issues[] = 'رقم جواز السفر — يجب ألا يقل عن 5 خانات';
                }
            }
        }
        // Separate annexes marked manualFillAnnex are printed as blank templates and excluded from wizard validation.
        // Their internal fields are completed manually after printing, not inside the customer wizard.
        return ['steps'=>$resolved['steps'],'issues'=>array_values(array_unique($issues))];
    }

    /** @return array{clauses:array,missingVariables:array,missingClauseKeys:array} */
    public function renderLegalClauses(array $definition,string $variantKey,array $optionalKeys,array $fieldValues):array
    {
        $resolved=$this->resolve($definition,$variantKey,$optionalKeys,$fieldValues);
        $variant=$resolved['variant'];
        $effectiveOptionalKeys=$this->effectiveOptionalKeys($definition,$variant,$optionalKeys,$fieldValues);
        $available=[];$clauseByKey=[];$clauses=[];$missing=[];$manualClauseKeys=[];$fieldByKey=[];
        foreach($resolved['steps'] as$step)foreach($step['fields']??[]as$field){$fieldKey=(string)($field['key']??'');if($fieldKey!=='')$fieldByKey[$fieldKey]=$field;}
        foreach($definition['optionalClauses']??[] as$optional){if(in_array((string)($optional['key']??''),$effectiveOptionalKeys,true)&&($optional['manualFillAnnex']??false)){foreach($optional['legalClauseKeys']??[] as$key)$manualClauseKeys[(string)$key]=true;}}
        foreach($definition['legalClauses']??[] as$clause){$key=(string)($clause['key']??'');if(($clause['enabled']??true)!==false){$available[$key]=true;$clauseByKey[$key]=$clause;}}
        $missingKeys=array_values(array_filter($resolved['activeClauseKeys'],fn($key)=>!isset($available[$key])));
        foreach($resolved['activeClauseKeys'] as$key){
            $key=(string)$key;$clause=$clauseByKey[$key]??null;if(!$clause||!$this->evaluate($clause['visibleWhen']??null,$fieldValues))continue;
            $manual=isset($manualClauseKeys[$key]);$body=(string)($clause['bodyAr']??'');$vars=$manual?[]:($clause['variables']??[]);
            foreach($vars as$var){$token='{{'.$var.'}}';$derived=$this->derivedClauseValue((string)$var,$fieldValues);$isDerived=!$this->emptyValue($derived);$value=$isDerived?$derived:($fieldValues[$var]??null);if($this->emptyValue($value)){$missing[]=(string)$var;continue;}$display=$isDerived?trim((string)$value):$this->displayClauseValue((string)$var,$value,$fieldByKey[(string)$var]??null,$fieldValues);$body=str_replace($token,$display,$body);}
            $clauses[]=['key'=>$key,'titleAr'=>$clause['titleAr']??$key,'bodyAr'=>$body,'sourceDocumentName'=>$clause['sourceDocumentName']??null,'sourcePageStart'=>$clause['sourcePageStart']??null,'sourcePageEnd'=>$clause['sourcePageEnd']??null];
        }
        return ['clauses'=>$clauses,'missingVariables'=>array_values(array_unique($missing)),'missingClauseKeys'=>$missingKeys];
    }

    private function derivedClauseValue(string $key,array $fieldValues):?string
    {
        $valueText=function(string $fieldKey)use($fieldValues):?string{$value=$fieldValues[$fieldKey]??null;if($this->emptyValue($value))return null;$text=trim((string)$value);if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$text)===1){$parts=explode('-',$text);return implode('/',array_reverse($parts));}return$text;};
        $moneyWordSources=[
            'social_fee_words'=>'social_fee',
            'visual_contract_value_words'=>'visual_contract_value',
            'website_total_price_words'=>'website_total_price',
            'sale_total_price_words'=>'sale_total_price',
            'deposit_amount_words'=>'deposit_amount',
            'rent_amount_words'=>'rent_amount',
        ];
        if(isset($moneyWordSources[$key]))return $this->numberToEgyptianPoundsWords($fieldValues[$moneyWordSources[$key]]??null);

        $partyDefinitions=[
            'social_client_party_definition'=>['social_client','الطرف الأول (العميل)','tax_number','company_phone','required'],
            'social_provider_party_definition'=>['social_provider','الطرف الثاني (مقدم الخدمة)','tax_number','company_phone','required'],
            'visual_client_party_definition'=>['visual_client','الطرف الأول (العميل)','tax_number','company_phone','required'],
            'visual_provider_party_definition'=>['visual_provider','الطرف الثاني (المصمم)','tax_number','company_phone','required'],
            'website_client_party_definition'=>['website_client','الطرف الأول (العميل)','tax_number','company_phone','none'],
            'website_provider_party_definition'=>['website_provider','الطرف الثاني (مقدم الخدمة)','tax_number','company_phone','optional'],
            'sale_seller_party_definition'=>['seller','الطرف الأول (البائع)','tax_card','phone','none'],
            'sale_buyer_party_definition'=>['buyer','الطرف الثاني (المشتري)','tax_card','phone','none'],
            'rental_landlord_party_definition'=>['landlord','الطرف الأول (المؤجر)','tax_card','company_phone','none'],
            'rental_tenant_party_definition'=>['tenant','الطرف الثاني (المستأجر)','tax_card','company_phone','none'],
        ];
        if(isset($partyDefinitions[$key])){
            [$prefix,$role,$taxSuffix,$companyPhoneSuffix,$authorityMode]=$partyDefinitions[$key];
            return $this->partyDefinition($fieldValues,$prefix,$role,$taxSuffix,$companyPhoneSuffix,$authorityMode);
        }
        if($key==='sale_remaining_amount'){
            $total=(float)($fieldValues['sale_total_price']??0);$down=(float)($fieldValues['sale_down_payment']??0);
            if($total<=0||$down<0||$down>$total)return null;
            return $this->formatLegalNumber($total-$down);
        }
        if($key==='rental_property_additional_details'){
            $parts=[];
            $add=function(string $label,string $fieldKey)use(&$parts,$valueText):void{$value=$valueText($fieldKey);if($value!==null)$parts[]=$label.': '.$value;};
            $addYesNo=function(string $label,string $fieldKey)use(&$parts,$valueText):void{$value=$valueText($fieldKey);if($value!==null)$parts[]=$label.': '.($value==='yes'?'نعم':($value==='no'?'لا':$value));};
            $meterType=fn(?string $value)=>$value==='independent'?'مستقل':($value==='shared'?'مشترك':$value);
            $add('رقم العقار/المبنى','building_number');
            foreach([['electricity','الكهرباء'],['water','المياه'],['gas','الغاز الطبيعي']] as[$prefix,$label]){$number=$valueText($prefix.'_meter');$type=$meterType($valueText($prefix.'_meter_type'));if($number||$type){$detail='عداد '.$label.': ';if($number)$detail.='رقم '.$number;if($number&&$type)$detail.=' — ';if($type)$detail.='نوعه '.$type;$parts[]=$detail;}}
            if(array_key_exists('residential_property_type',$fieldValues)){
                $add('اسم الكمبوند','residential_compound_name');$add('رقم القطعة','residential_plot_number');$add('رقم المجاورة','residential_adjacency_number');$add('اسم البرج/العمارة','residential_building_name');
                $annexes=[];if($fieldValues['residential_includes_garage']??false)$annexes[]='جراج';if($fieldValues['residential_includes_storage']??false)$annexes[]='مخزن';if($fieldValues['residential_includes_garden']??false)$annexes[]='حديقة';if($fieldValues['residential_includes_roof']??false)$annexes[]='سطح/رووف';if($fieldValues['residential_includes_service_room']??false)$annexes[]='غرفة خدمات';if($fieldValues['residential_includes_parking']??false)$annexes[]='مكان انتظار سيارة';if($other=$valueText('residential_other_annex'))$annexes[]=$other;if($annexes)$parts[]='ملحقات العين: '.implode('، ',$annexes);
            }elseif(array_key_exists('commercial_activity_name',$fieldValues)){
                $add('اسم المول/المشروع التجاري','commercial_project_name');$add('رقم الترخيص','commercial_license_number');$add('رقم القطعة','commercial_plot_number');$site=$valueText('commercial_site_type');if($site==='أخرى')$site=$valueText('commercial_site_type_other');if($site)$parts[]='موقع الوحدة: '.$site;$addYesNo('وجود ميزانين','commercial_has_mezzanine');$add('عرض الواجهة بالمتر','commercial_frontage_width');$add('عدد الواجهات','commercial_frontage_count');$addYesNo('مخزن تابع','commercial_has_storage');$addYesNo('مكان تحميل وتنزيل','commercial_has_loading_area');if((string)($fieldValues['commercial_finishing_level']??'')==='أخرى')$add('وصف التشطيب','commercial_finishing_other');
            }elseif(array_key_exists('administrative_activity_name',$fieldValues)){
                $add('اسم المشروع/البرج الإداري','administrative_project_name');$add('رقم الترخيص','administrative_license_number');$add('رقم القطعة','administrative_plot_number');$site=$valueText('administrative_site_type');if($site==='أخرى')$site=$valueText('administrative_site_type_other');if($site)$parts[]='موقع العين: '.$site;$addYesNo('قاعة اجتماعات','administrative_meeting_room');$addYesNo('استقبال','administrative_reception');$addYesNo('مخزن تابع','administrative_storage');$addYesNo('مصعد','administrative_lift');$add('عدد أماكن الانتظار','administrative_parking_count');$addYesNo('غرفة خوادم','administrative_server_room');$add('نظام التكييف','administrative_ac_system');$add('شبكة البيانات','administrative_data_network');$delivery=$valueText('administrative_delivery_condition');$deliveryMap=['vacant'=>'خالية','furnished'=>'مؤثثة','fully_equipped'=>'مجهزة بالكامل','inventory_report'=>'وفقًا لمحضر الجرد'];if($delivery)$parts[]='حالة العين عند التسليم: '.($deliveryMap[$delivery]??$delivery);$add('قراءة الكهرباء عند التسليم','administrative_electricity_reading');$add('قراءة المياه عند التسليم','administrative_water_reading');$add('قراءة الغاز عند التسليم','administrative_gas_reading');
            }
            return $parts?'وتُستكمل بيانات وصف العين بما يلي: '.implode('؛ ',$parts).'.':'ولا توجد بيانات تعريفية إضافية للعين بخلاف ما تقدم.';
        }
        if($key==='sale_property_additional_details'){
            $parts=[];$add=function(string $label,string $fieldKey)use(&$parts,$valueText):void{$value=$valueText($fieldKey);if($value!==null)$parts[]=$label.': '.$value;};$meterType=fn(?string $value)=>$value==='independent'?'مستقل':($value==='shared'?'مشترك':$value);
            $add('اسم الكمبوند','sale_compound_name');$add('رقم القطعة','sale_plot_number');$add('رقم المجاورة','sale_adjacency_number');$add('رقم العقار','sale_building_number');$add('اسم البرج/العمارة','sale_building_name');
            foreach([['electricity','الكهرباء'],['water','المياه'],['gas','الغاز الطبيعي']] as[$prefix,$label]){$number=$valueText('sale_'.$prefix.'_meter');$type=$meterType($valueText('sale_'.$prefix.'_meter_type'));$reading=$valueText('sale_'.$prefix.'_meter_reading');if($number||$type||$reading){$detail='عداد '.$label.': ';if($number)$detail.='رقم '.$number;if($number&&$type)$detail.=' — ';if($type)$detail.='نوعه '.$type;if(($number||$type)&&$reading)$detail.=' — ';if($reading)$detail.='قراءته عند التسليم '.$reading;$parts[]=$detail;}}
            return $parts?'وتشمل البيانات التعريفية الإضافية للوحدة: '.implode('؛ ',$parts).'.':'ولا توجد بيانات تعريفية إضافية للوحدة بخلاف ما تقدم.';
        }
        if($key==='website_legal_fees_text'){
            if((bool)($fieldValues['website_legal_fees_enabled']??false)){
                $raw=$fieldValues['website_legal_fees_payer']??null;$payer=($raw==='أخرى'||$raw==='other')?$valueText('website_legal_fees_other'):$valueText('website_legal_fees_payer');if(!$payer)return null;
                return "اتفق الطرفان على أن يتحمل {$payer} رسوم الدمغة أو الضرائب أو المصروفات القانونية الخاصة بهذا العقد أو تحريره أو إثبات تاريخه أو توثيقه أو أي إجراء قانوني مرتبط به، وذلك في الحدود التي تجيزها القوانين واللوائح السارية ودون إخلال بما يفرضه القانون على أي طرف بصفته.";
            }
            return 'ما لم يتفق الطرفان كتابةً على خلاف ذلك، يتحمل كل طرف الرسوم والضرائب والمصروفات التي يفرضها عليه القانون بحكم صفته أو التزاماته أو التصرفات الصادرة عنه.';
        }
        if($key==='preliminary_ownership_detail'){
            return match((string)($fieldValues['preliminary_ownership_source']??'')){
                'preliminary_contract'=>($date=$valueText('preliminary_contract_date'))?"عقد بيع ابتدائي مؤرخ {$date}":null,
                'custom_contract'=>($date=$valueText('custom_contract_date'))?"عقد بيع عرفي مؤرخ {$date}":null,
                'court_judgment'=>(($number=$valueText('ownership_judgment_number'))&&($year=$valueText('ownership_judgment_year')))?"حكم قضائي رقم {$number} لسنة {$year}":null,
                'allocation'=>($authority=$valueText('ownership_allocation_authority'))?"تخصيص صادر من {$authority}":null,
                default=>null,
            };
        }
        if($key==='registrable_ownership_detail'){
            return match((string)($fieldValues['registered_title_type']??'')){
                'registered_contract'=>(($number=$valueText('registered_deed_number'))&&($year=$valueText('registered_deed_year'))&&($office=$valueText('registry_office')))?"عقد مسجل رقم {$number} لسنة {$year} لدى {$office}":null,
                'final_judgment'=>(($number=$valueText('registered_judgment_number'))&&($year=$valueText('registered_judgment_year'))&&($court=$valueText('registered_judgment_court')))?"حكم نهائي رقم {$number} لسنة {$year} صادر من {$court}":null,
                'allocation'=>($authority=$valueText('registered_allocation_authority'))?"عقد تخصيص صادر من {$authority}":null,
                'other'=>($other=$valueText('registered_other_title'))?"سند آخر: {$other}":null,
                default=>null,
            };
        }
        if($key==='inheritance_disposition_detail'){
            return match((string)($fieldValues['inheritance_disposition_basis']??'')){
                'power_of_attorney'=>(($number=$valueText('inheritance_poa_number'))&&($year=$valueText('inheritance_poa_year'))&&($office=$valueText('inheritance_poa_office'))&&($date=$valueText('inheritance_poa_date')))?"توكيل رسمي رقم {$number} لسنة {$year} موثق لدى {$office} بتاريخ {$date}":null,
                'partition_contract'=>($date=$valueText('inheritance_partition_date'))?"عقد قسمة وتراضٍ بين الورثة مؤرخ {$date}":null,
                'relinquishment_contract'=>($date=$valueText('inheritance_relinquishment_date'))?"عقد تخارج أو تنازل مؤرخ {$date}":null,
                'sale_from_heirs'=>($date=$valueText('inheritance_heirs_sale_date'))?"عقد بيع أو تصرف من باقي الورثة مؤرخ {$date}":null,
                'sole_heir'=>'البائع هو الوارث الوحيد وفق إعلام الوراثة المثبت بالعقد',
                'other'=>($other=$valueText('inheritance_other_basis'))?"سند قانوني آخر: {$other}":null,
                default=>null,
            };
        }
        if($key==='commercial_guarantee_value_text'){
            $mode=(string)($fieldValues['commercial_guarantee_value_mode']??'');$amount=$valueText($mode==='each'?'commercial_guarantee_each_amount':($mode==='total'?'commercial_guarantee_total_amount':''));if(!$amount)return null;return$mode==='each'?"وقيمة كل شيك {$amount} جنيه مصري":"وإجمالي قيمة الشيكات {$amount} جنيه مصري";
        }
        if($key==='administrative_guarantee_value_text'){
            $mode=(string)($fieldValues['administrative_guarantee_value_mode']??'');$amount=$valueText($mode==='each'?'administrative_guarantee_each_amount':($mode==='total'?'administrative_guarantee_total_amount':''));if(!$amount)return null;return$mode==='each'?"وقيمة كل شيك {$amount} جنيه مصري":"وإجمالي قيمة الشيكات {$amount} جنيه مصري";
        }
        return null;
    }

    private function partyDefinition(array $fieldValues,string $prefix,string $role,string $taxSuffix,string $companyPhoneSuffix,string $authorityMode):?string
    {
        $text=function(string $suffix)use($fieldValues,$prefix):?string{$value=$fieldValues[$prefix.'_'.$suffix]??null;if($this->emptyValue($value))return null;$text=trim((string)$value);if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$text)===1){$parts=explode('-',$text);return implode('/',array_reverse($parts));}return$text;};
        $type=$text('party_type')??'individual';
        if($type==='company'){
            $company=$text('company_name');$legalForm=$text('company_legal_form');$register=$text('commercial_register');$tax=$text($taxSuffix);$rep=$text('legal_representative');$capacity=$text('representative_capacity');$address=$text('company_address');
            if(!$company||!$legalForm||!$register||!$tax||!$rep||!$capacity||!$address)return null;
            $authority='';$basis=$text('authority_basis');
            if($authorityMode==='required'&&!$basis)return null;
            if($basis==='commercial_register')$authority='، بموجب الصفة الثابتة بالسجل التجاري';
            elseif($basis==='power_of_attorney'){
                $no=$text('power_of_attorney_number');$year=$text('power_of_attorney_year');$office=$text('power_of_attorney_office');
                if($authorityMode==='required'&&(!$no||!$year||!$office))return null;
                if($no&&$year&&$office)$authority="، بموجب توكيل رقم {$no} لسنة {$year} موثق لدى {$office}";
            }
            $phone=$text($companyPhoneSuffix);$email=$text('company_email');
            $taxLabel=$taxSuffix==='tax_card'?'والبطاقة الضريبية رقم':'والرقم الضريبي الموحد';
            return "شركة/منشأة «{$company}»، شكلها القانوني {$legalForm}، سجل تجاري رقم {$register}، {$taxLabel} {$tax}، ومقرها {$address}، ويمثلها قانونًا السيد/ {$rep} بصفته {$capacity}{$authority}".($phone?"، ورقم الهاتف {$phone}":'').($email?"، والبريد الإلكتروني {$email}":'')."، ويشار إليها في هذا العقد بـ «{$role}».";
        }
        $name=$text('name');$nationality=$text('nationality');$identityType=$text('identity_document_type');$identity=$text('national_id');$address=$text('address');$phone=$text('phone');
        if(!$name||!$nationality||!$identityType||!$identity||!$address||!$phone)return null;
        $identityLabel=$identityType==='passport'?'رقم جواز السفر':'الرقم القومي';$issuer=$text('id_issuer');$issueDate=$text('id_issue_date');$email=$text('email');
        $issueText='';if($issuer||$issueDate)$issueText='، '.($issuer?"صادر من {$issuer}":'').($issuer&&$issueDate?' ':'').($issueDate?"بتاريخ {$issueDate}":'');
        return "السيد/ {$name}، {$nationality} الجنسية، يحمل {$identityLabel} رقم {$identity}{$issueText}، وعنوانه {$address}، ورقم هاتفه {$phone}".($email?"، وبريده الإلكتروني {$email}":'')."، ويشار إليه في هذا العقد بـ «{$role}».";
    }

    private function numberToArabicWordsBare(mixed $input):?string
    {
        if(!is_numeric($input))return null;$numeric=(float)$input;if(!is_finite($numeric)||$numeric<0)return null;$n=(int)floor($numeric);
        if($n===0)return 'صفر';
        $ones=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
        $tens=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
        $hundreds=['','مائة','مئتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
        $belowThousand=function(int $value)use($ones,$tens,$hundreds):string{if($value===0)return'';if($value<20)return$ones[$value];$h=intdiv($value,100);$rem=$value%100;$parts=[];if($h)$parts[]=$hundreds[$h];if($rem){if($rem<20)$parts[]=$ones[$rem];else{$t=intdiv($rem,10);$o=$rem%10;$parts[]=$o?$ones[$o].' و'.$tens[$t]:$tens[$t];}}return implode(' و',$parts);};
        $scales=[[1000000000,'مليار','ملياران','مليارات'],[1000000,'مليون','مليونان','ملايين'],[1000,'ألف','ألفان','آلاف']];$remaining=$n;$parts=[];
        foreach($scales as[$value,$singular,$dual,$plural]){if($remaining<$value)continue;$count=intdiv($remaining,$value);$remaining%=$value;if($count===1)$parts[]=$singular;elseif($count===2)$parts[]=$dual;elseif($count>=3&&$count<=10)$parts[]=$belowThousand($count).' '.$plural;else$parts[]=$belowThousand($count).' '.$singular;}
        if($remaining)$parts[]=$belowThousand($remaining);return implode(' و',$parts);
    }

    private function numberToEgyptianPoundsWords(mixed $input):?string
    {
        if(!is_numeric($input))return null;$numeric=(float)$input;if(!is_finite($numeric)||$numeric<0)return null;
        $pounds=(int)floor($numeric+0.000000001);$piasters=(int)round(($numeric-$pounds)*100);
        if($piasters===100){$pounds++;$piasters=0;}
        $poundsWords=$this->numberToArabicWordsBare($pounds);if($poundsWords===null)return null;
        if($piasters===0)return $poundsWords.' جنيه مصري فقط لا غير';
        $piastersWords=$this->numberToArabicWordsBare($piasters);if($piastersWords===null)return null;
        return $poundsWords.' جنيه مصري و'.$piastersWords.' قرشًا فقط لا غير';
    }

    private function formatLegalNumber(float $value):string
    {
        if(abs($value-round($value))<0.000001)return number_format($value,0,'.','');
        return rtrim(rtrim(number_format($value,2,'.',''),'0'),'.');
    }

    private function displayClauseValue(string $key,mixed $value,?array $field,array $fieldValues):string
    {
        if($value==='أخرى'||$value==='other'){$other=$fieldValues[$key.'_other']??null;if($this->emptyValue($other)&&str_ends_with($key,'_payer')){$base=substr($key,0,-strlen('_payer'));$other=$fieldValues[$base.'_other']??null;}if(!$this->emptyValue($other))return trim((string)$other);}
        foreach($field['options']??[]as$option)if((string)($option['value']??'')===(string)$value)return(string)($option['labelAr']??$value);
        if(is_bool($value))return$value?'نعم':'لا';
        if(is_array($value)){
            $parts=[];
            foreach($value as$item){
                if(is_array($item)){
                    $columns=$field['columns']??[];$rowParts=[];
                    if(!$columns){foreach(array_keys($item) as$columnKey)$columns[]=['key'=>$columnKey];}
                    foreach($columns as$column){
                        $columnKey=(string)($column['key']??'');if($columnKey==='')continue;$raw=$item[$columnKey]??null;if($this->emptyValue($raw))continue;
                        if($columnKey==='details'&&(string)($item['method']??'')==='other')continue;
                        if(($raw==='other'||$raw==='أخرى')&&!$this->emptyValue($item['details']??null)){$rowParts[]=trim((string)$item['details']);continue;}
                        $label=null;foreach($column['options']??[]as$option){if((string)($option['value']??'')===(string)$raw){$label=(string)($option['labelAr']??$raw);break;}}
                        if($label!==null){$rowParts[]=$label;continue;}
                        if(is_bool($raw)){$rowParts[]=$raw?'نعم':'لا';continue;}
                        $text=trim((string)$raw);if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$text)===1){$dateParts=explode('-',$text);$text=implode('/',array_reverse($dateParts));}if($text!=='')$rowParts[]=$text;
                    }
                    if($rowParts)$parts[]=implode(' — ',$rowParts);
                }
                elseif($item!==null&&trim((string)$item)!==''){$label=null;foreach($field['options']??[]as$option){if((string)($option['value']??'')===(string)$item){$label=(string)($option['labelAr']??$item);break;}}$parts[]=$label??(string)$item;}
            }
            return implode('، ',$parts);
        }
        $text=trim((string)$value);
        if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$text)===1){$parts=explode('-',$text);return implode('/',array_reverse($parts));}
        return$text;
    }

    private function effectiveOptionalKeys(array $definition,array $variant,array $selected,array $fieldValues):array
    {
        // Every annex is optional: only keys explicitly selected by the user are effective.
        return array_values(array_unique(array_map('strval',$selected)));
    }

    private function normalizeLegalSourceText(string $body,string $title):string
    {
        $text=str_replace(["\r\n","\r","\f"],["\n","\n",''],$body);
        $text=preg_replace('/[\t ]+$/mu','',$text)??$text;
        $text=preg_replace('/^\s*[A-Za-z][A-Za-z0-9 &()\/._-]{4,140}\s*\n/u','',$text)??$text;
        $text=preg_replace('/^\s*[^\n]{0,180}Z\s*DRAFT[^\n]*\n/iu','',$text)??$text;

        // Signature forms from the source PDFs are replaced by one consistent
        // signature block in the generated document. Keep any legal recital that
        // precedes the form itself.
        if(str_contains($title,'التوقيعات')){
            $cut=$this->firstTextPosition($text,['وتوقيعات الأطراف','وتوقيعات األطراف','الطرف الثاني (','الطرف الثاني(']);
            if($cut!==null)$text=mb_substr($text,0,$cut);
        }
        $cut=$this->firstTextPosition($text,['توقيعات الملحق','توقيعات الأطراف']);
        if($cut!==null)$text=mb_substr($text,0,$cut);
        $text=$this->trimTrailingSignatureForm($text);

        // Source PDFs used a human-readable placeholder instead of template
        // variables in a number of places. The actual values are printed once in
        // the certified contract-data section; cross-reference that section rather
        // than reproducing the raw placeholder text throughout the legal body.
        $placeholder='البيان المثبت بجدول بيانات العقد أو الملحق';
        $placeholderMain='البيان المثبت بجدول بيانات العقد';
        foreach([$placeholder,$placeholderMain] as $raw){
            $quoted=preg_quote($raw,'/');
            $text=preg_replace('/\(\s*'.$quoted.'\s*\)\s*(\d+(?:[.,]\d+)?)/u','$1',$text)??$text;
            $text=preg_replace('/'.$quoted.'\s*(\d+(?:[.,]\d+)?)/u','$1',$text)??$text;
        }
        $text=str_replace($placeholder,'البيان المعتمد في صدر العقد أو الملحق',$text);
        $text=str_replace($placeholderMain,'البيان المعتمد في صدر العقد',$text);
        $text=preg_replace('/(?<=\p{Arabic})(البيان المعتمد في صدر العقد(?: أو الملحق)?)/u',' — $1',$text)??$text;
        $text=preg_replace('/\n{3,}/u',"\n\n",$text)??$text;
        return trim($text);
    }

    private function trimTrailingSignatureForm(string $text):string
    {
        $length=max(1,mb_strlen($text));$positions=[];
        foreach(['توقيعات الطرفين','عاشرا :التوقيعات','عاشرًا :التوقيعات','التوقيعات'] as$marker){$pos=mb_strrpos($text,$marker);if($pos!==false&&$pos>($length*0.58))$positions[]=$pos;}
        return $positions?trim(mb_substr($text,0,min($positions))):$text;
    }

    private function firstTextPosition(string $text,array $needles):?int
    {
        $positions=[];
        foreach($needles as $needle){$pos=mb_strpos($text,$needle);if($pos!==false)$positions[]=$pos;}
        return $positions?min($positions):null;
    }

    public function coreIdentityFieldKeys(array $definition,string $variantKey):array
    {
        $variant=collect($definition['variants']??[])->firstWhere('key',$variantKey);if(!$variant)return[];$keys=[];
        foreach($variant['steps']??[] as $step){$stepKey=(string)($step['key']??'');if(in_array($stepKey,['sale_seller','sale_buyer','sale_unit','rental_landlord','rental_tenant','rental_property'],true)||preg_match('/(?:^|_)(seller|buyer|landlord|tenant|property|unit|parties|party)$/',$stepKey)){foreach($step['fields']??[] as $field)$keys[]=(string)$field['key'];}}
        return array_values(array_unique($keys));
    }

    private function emptyValue(mixed $value):bool{return $value===null||$value===''||(is_array($value)&&count($value)===0);}
}
