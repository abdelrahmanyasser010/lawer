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
                if (str_ends_with($fKey, '_national_id')) {
                    $natKey = preg_replace('/_national_id$/', '_nationality', $fKey);
                    $natVal = trim((string)($fieldValues[$natKey] ?? ''));
                    $idVal = trim((string)($fieldValues[$fKey] ?? ''));
                    if ($idVal !== '') {
                        $isEgyptian = in_array(mb_strtolower($natVal), ['مصري', 'egyptian', 'مصرية', 'مصري الجنسية'], true);
                        $digitsOnly = preg_replace('/\D/', '', $idVal);
                        if ($isEgyptian && (strlen($digitsOnly) !== 14 || $digitsOnly !== $idVal)) {
                            $issues[] = ($field['labelAr'] ?? $fKey) . ' — مطلوب 14 رقمًا قوميًا للمواطن المصري';
                        } elseif (!$isEgyptian && $natVal !== '' && mb_strlen($idVal) < 5) {
                            $issues[] = ($field['labelAr'] ?? $fKey) . ' — رقم جواز السفر يجب ألا يقل عن 5 خانات';
                        }
                    }
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
            foreach($vars as$var){$token='{{'.$var.'}}';$value=$fieldValues[$var]??null;if($this->emptyValue($value)){$missing[]=(string)$var;continue;}$body=str_replace($token,$this->displayClauseValue((string)$var,$value,$fieldByKey[(string)$var]??null,$fieldValues),$body);}
            $clauses[]=['key'=>$key,'titleAr'=>$clause['titleAr']??$key,'bodyAr'=>$body,'sourceDocumentName'=>$clause['sourceDocumentName']??null,'sourcePageStart'=>$clause['sourcePageStart']??null,'sourcePageEnd'=>$clause['sourcePageEnd']??null];
        }
        return ['clauses'=>$clauses,'missingVariables'=>array_values(array_unique($missing)),'missingClauseKeys'=>$missingKeys];
    }

    private function displayClauseValue(string $key,mixed $value,?array $field,array $fieldValues):string
    {
        if($value==='أخرى'){$other=$fieldValues[$key.'_other']??null;if(!$this->emptyValue($other))return trim((string)$other);}
        foreach($field['options']??[]as$option)if((string)($option['value']??'')===(string)$value)return(string)($option['labelAr']??$value);
        if(is_bool($value))return$value?'نعم':'لا';
        if(is_array($value)){
            $parts=[];
            foreach($value as$item){
                if(is_array($item)){$row=array_values(array_filter(array_map('strval',$item),fn($entry)=>trim($entry)!==''));if($row)$parts[]=implode(' — ',$row);}
                elseif($item!==null&&trim((string)$item)!=='')$parts[]=(string)$item;
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
