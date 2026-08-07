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
            $insert = array_values($clause['insertedSteps'] ?? []);
            $before = (string)($clause['insertBeforeStepKey'] ?? '');
            $index = null;
            foreach ($steps as $i => $step) if (($step['key'] ?? null) === $before) { $index = $i; break; }
            if ($index === null) $steps = array_merge($steps, $insert); else array_splice($steps, $index, 0, $insert);
            foreach ($clause['legalClauseKeys'] ?? [] as $clauseKey) $active[(string)$clauseKey] = true;
        }
        $resolved = [];
        foreach ($steps as $step) {
            if (!$this->evaluate($step['visibleWhen'] ?? null, $fieldValues)) continue;
            $step['fields'] = array_values(array_filter($step['fields'] ?? [], fn(array $field) => $this->evaluate($field['visibleWhen'] ?? null, $fieldValues)));
            $resolved[] = $step;
        }
        return ['variant'=>$variant,'steps'=>$resolved,'activeClauseKeys'=>array_keys($active)];
    }

    public function evaluate(?array $condition, array $fieldValues): bool
    {
        if (!$condition) return true;
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
                            if (($column['required'] ?? false) && $this->emptyValue($row[$column['key']] ?? null)) {
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
        if (($definition['slug'] ?? null) === 'apartment_sale') {
            $installments = in_array('sale_installment_schedule', $optionalKeys, true);
            $method = $fieldValues['sale_payment_method'] ?? null;
            if ($installments && $method !== 'installments') $issues[] = 'ملحق الأقساط يتطلب اختيار السداد بالأقساط';
            if (!$installments && $method === 'installments') $issues[] = 'السداد بالأقساط يتطلب تفعيل ملحق جدول الأقساط';
            if ($installments) {
                $total=(float)($fieldValues['sale_total_price']??0);$down=(float)($fieldValues['sale_down_payment']??0);$remaining=(float)($fieldValues['sale_remaining_amount']??0);
                $rows=is_array($fieldValues['sale_installment_rows']??null)?$fieldValues['sale_installment_rows']:[];$sum=0;foreach($rows as $row)$sum+=(float)($row['amount']??0);
                if($total>0&&abs($total-($down+$remaining))>0.01)$issues[]='إجمالي الثمن لا يساوي المقدم + المتبقي';
                if($remaining>0&&$rows&&abs($remaining-$sum)>0.01)$issues[]='مجموع الأقساط لا يساوي المبلغ المتبقي';
            }
        }
        if (($definition['slug'] ?? null) === 'freelancer') {
            if (in_array('visual_identity_financial_annex',$optionalKeys,true)) {
                $total=(float)($fieldValues['visual_financial_total']??0);$rows=is_array($fieldValues['visual_payment_schedule']??null)?$fieldValues['visual_payment_schedule']:[];$sum=0;$pct=0;$hasPct=false;
                foreach($rows as $r){$sum+=(float)($r['amount']??0);if((float)($r['percentage']??0)>0){$pct+=(float)$r['percentage'];$hasPct=true;}}
                if($total>0&&$rows&&abs($total-$sum)>0.01)$issues[]='مجموع دفعات ملحق الهوية البصرية يجب أن يساوي إجمالي المقابل المالي';
                if($hasPct&&abs($pct-100)>0.01)$issues[]='مجموع نسب دفعات ملحق الهوية البصرية يجب أن يساوي 100%';
            }
            if (in_array('social_media_financial_annex',$optionalKeys,true)) {
                $total=(float)($fieldValues['social_financial_amount']??0);$rows=is_array($fieldValues['social_payment_plan']??null)?$fieldValues['social_payment_plan']:[];$sum=0;foreach($rows as $r)$sum+=(float)($r['amount']??0);
                if($total>0&&$rows&&abs($total-$sum)>0.01)$issues[]='مجموع دفعات ملحق إدارة منصات التواصل يجب أن يساوي قيمة المقابل المالي';
                if(($fieldValues['social_has_ad_budget']??null)==='yes'&&(float)($fieldValues['social_ad_budget']??0)<=0)$issues[]='يجب إدخال قيمة الميزانية الإعلانية عند اختيار وجود حملات ممولة';
            }
            if(in_array('website_sla_annex',$optionalKeys,true)&&empty($fieldValues['website_sla_levels']))$issues[]='يجب إدخال مستوى خدمة واحد على الأقل في ملحق الصيانة والدعم';
        }
        return ['steps'=>$resolved['steps'],'issues'=>array_values(array_unique($issues))];
    }

    /** @return array{clauses:array,missingVariables:array,missingClauseKeys:array} */
    public function renderLegalClauses(array $definition,string $variantKey,array $optionalKeys,array $fieldValues):array
    {
        $resolved=$this->resolve($definition,$variantKey,$optionalKeys,$fieldValues);$active=array_fill_keys($resolved['activeClauseKeys'],true);$available=[];$clauses=[];$missing=[];
        foreach($definition['legalClauses']??[] as $clause){if(($clause['enabled']??true)!==false)$available[(string)$clause['key']]=true;}
        $missingKeys=array_values(array_filter(array_keys($active),fn($key)=>!isset($available[$key])));
        foreach($definition['legalClauses']??[] as $clause){$key=(string)($clause['key']??'');if(!isset($active[$key])||($clause['enabled']??true)===false||!$this->evaluate($clause['visibleWhen']??null,$fieldValues))continue;
            $body=preg_replace_callback('/{{\s*([a-zA-Z0-9_.-]+)\s*}}/',function($m)use($fieldValues,&$missing){$v=$fieldValues[$m[1]]??null;$text=is_array($v)?json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES):(string)($v??'');if($text===''){$missing[$m[1]]=true;return '{{'.$m[1].'}}';}return $text;},(string)($clause['bodyAr']??''));
            $clauses[]=['key'=>$key,'titleAr'=>$clause['titleAr']??$key,'bodyAr'=>$body,'sourceDocumentName'=>$clause['sourceDocumentName']??null,'sourcePageStart'=>$clause['sourcePageStart']??null,'sourcePageEnd'=>$clause['sourcePageEnd']??null];
        }
        return ['clauses'=>$clauses,'missingVariables'=>array_keys($missing),'missingClauseKeys'=>$missingKeys];
    }

    public function coreIdentityFieldKeys(array $definition,string $variantKey):array
    {
        $variant=collect($definition['variants']??[])->firstWhere('key',$variantKey);if(!$variant)return[];$keys=[];
        foreach($variant['steps']??[] as $step){$stepKey=(string)($step['key']??'');if(in_array($stepKey,['sale_seller','sale_buyer','sale_unit','rental_landlord','rental_tenant','rental_property'],true)||preg_match('/(?:^|_)(seller|buyer|landlord|tenant|property|unit|parties|party)$/',$stepKey)){foreach($step['fields']??[] as $field)$keys[]=(string)$field['key'];}}
        return array_values(array_unique($keys));
    }

    private function emptyValue(mixed $value):bool{return $value===null||$value===''||(is_array($value)&&count($value)===0);}
}
