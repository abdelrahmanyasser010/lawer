from pathlib import Path
import json,sys,re
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def check(name,ok,note=''):
    checks.append((name,bool(ok),note)); print(('PASS' if ok else 'FAIL'),name,note)
def txt(rel): return (ROOT/rel).read_text(encoding='utf-8')

def atoms(cond):
    if not isinstance(cond,dict): return []
    if 'all' in cond: return [a for x in cond.get('all',[]) for a in atoms(x)]
    if 'any' in cond: return [a for x in cond.get('any',[]) for a in atoms(x)]
    if 'not' in cond: return atoms(cond.get('not'))
    return [cond] if 'fieldKey' in cond else []
def has(cond,key,op=None,val=None,with_val=False):
    for a in atoms(cond):
        if a.get('fieldKey')!=key: continue
        if op is not None and a.get('operator')!=op: continue
        if with_val and a.get('value')!=val: continue
        return True
    return False

d=json.loads(txt('backend/database/template-definitions/rental.json'))
check('rental_version_8',d.get('version')==8)
check('family_price_disabled',d.get('priceEgp')==0)
check('three_variants_exact',[v.get('key') for v in d.get('variants',[])]==['residential_lease','commercial_lease','administrative_lease'])
check('variant_pricing_exact_keys',set(d.get('variantPricing',{}))=={'residential_lease','commercial_lease','administrative_lease'})
for k,p in d.get('variantPricing',{}).items():
    check(f'{k}_self_price_independent',isinstance(p.get('selfServicePriceEgp'),(int,float)))
    check(f'{k}_lawyer_price_independent',isinstance(p.get('lawyerAssistedPriceEgp'),(int,float)))

variants={v['key']:v for v in d['variants']}
clauses={c['key']:c for c in d.get('legalClauses',[])}
annexes={a['key']:a for a in d.get('optionalClauses',[])}

def fields_for(vkey):
    return {f['key']:f for s in variants[vkey]['steps'] for f in s.get('fields',[])}
def order(vkey): return variants[vkey].get('requiredClauseKeys',[])
all_fields={k:fields_for(k) for k in variants}

# Source-color party rules and company conditionals.
for vkey,fields in all_fields.items():
    for prefix in ['landlord','tenant']:
        for suffix in ['party_type','name','nationality','national_id','address','phone']:
            check(f'{vkey}_{prefix}_{suffix}_required',fields.get(f'{prefix}_{suffix}',{}).get('required') is True)
        for suffix in ['id_issuer','id_issue_date']:
            check(f'{vkey}_{prefix}_{suffix}_optional',fields.get(f'{prefix}_{suffix}',{}).get('required') is not True)
        for suffix in ['company_name','company_legal_form','commercial_register','tax_card','legal_representative','representative_capacity','company_address','company_email']:
            f=fields.get(f'{prefix}_{suffix}',{})
            check(f'{vkey}_{prefix}_{suffix}_company_required',f.get('required') is True and has(f.get('visibleWhen'),f'{prefix}_party_type','equals','company',True))
    for prefix in ['landlord','tenant']:
        check(f'{vkey}_{prefix}_party_type_ui_only',fields.get(f'{prefix}_party_type',{}).get('printInDocument') is False)
    for bad in ['landlord_id_attachment','tenant_id_attachment','landlord_national_id_attachment','tenant_national_id_attachment']:
        check(f'{vkey}_no_required_id_scan_{bad}',bad not in fields)

# Contract/meta and common orange property fields.
for vkey,fields in all_fields.items():
    for key in ['contract_date','contract_copies_count','property_governorate','property_city','property_district','property_street','floor_number','unit_number','property_area','lease_duration_text','start_date','end_date','property_delivery_date','deposit_amount','deposit_amount_words','rent_period','rent_amount','rent_amount_words','rent_due_day','holdover_daily_compensation']:
        check(f'{vkey}_{key}_required',fields.get(key,{}).get('required') is True,key)
    check(f'{vkey}_copies_min_two',fields.get('contract_copies_count',{}).get('validation',{}).get('min')==2)
    for key in ['building_number','electricity_meter','electricity_meter_type','water_meter','water_meter_type','gas_meter','gas_meter_type']:
        check(f'{vkey}_{key}_not_statically_forced',fields.get(key,{}).get('required') is not True)
    for stem in ['electricity','water','gas']:
        number_key=f'{stem}_meter'; type_key=f'{stem}_meter_type'
        check(f'{vkey}_{stem}_meter_number_required_if_type',has(fields.get(number_key,{}).get('requiredWhen'),type_key,'truthy'))
        check(f'{vkey}_{stem}_meter_type_required_if_number',has(fields.get(type_key,{}).get('requiredWhen'),number_key,'truthy'))
    defaults=variants[vkey].get('defaultFieldValues',{})
    for key in ['deposit_amount','rent_amount','rent_due_day','holdover_daily_compensation','start_date','end_date','property_delivery_date']:
        check(f'{vkey}_no_fake_default_{key}',key not in defaults)

# Residential specific source behavior.
r=all_fields['residential_lease']; ro=order('residential_lease')
for key in ['residential_property_type','rooms_count','reception_count','bathrooms_count','balconies_count','residential_finishing_level','residential_kitchen_description','residential_use_purpose','rental_payment_methods','residential_payment_grace_days','late_payment_daily_compensation']:
    check('res_required_'+key,r.get(key,{}).get('required') is True)
for key in ['residential_compound_name','residential_plot_number','residential_adjacency_number','residential_building_name']:
    check('res_optional_'+key,r.get(key,{}).get('required') is not True)
check('res_no_early_termination','residential_early_termination_enabled' not in r and 'commercial_early_termination_enabled' not in r and 'administrative_early_termination_enabled' not in r)
check('res_no_sublease_control',all('sublease' not in k and 'assignment' not in k for k in r))
check('res_no_auto_renewal_control',all('renew' not in k for k in r))
check('res_multi_payment_repeater',r.get('rental_payment_methods',{}).get('type')=='repeater' and r.get('rental_payment_methods',{}).get('minRows')==1)
cols={c['key']:c for c in r.get('rental_payment_methods',{}).get('columns',[])}
check('res_payment_method_column_required',cols.get('method',{}).get('required') is True)
check('res_other_payment_details_conditional',has(cols.get('details',{}).get('requiredWhen'),'method','equals','other',True) and has(cols.get('details',{}).get('visibleWhen'),'method','equals','other',True))
check('res_no_editable_annual_rate','annual_increase_rate' not in r)
res_ann=clauses.get('rental_residential_annual_increase_clause',{})
check('res_fixed_annual_10','عشرة بالمائة (10%)' in res_ann.get('bodyAr',''))
check('res_annual_conditional',has(res_ann.get('visibleWhen'),'annual_increase_enabled','truthy'))
check('res_furnished_optional',r.get('residential_is_furnished',{}).get('required') is not True)
check('res_other_annex_description_conditional',has(r.get('residential_other_annex',{}).get('requiredWhen'),'residential_other_annex_enabled','truthy'))
check('res_furnished_clause_order',ro.index('rental_residential_furnished_clause')==ro.index('residential_lease_source_article_04')+1)
check('res_annual_article8_order',ro.index('rental_residential_annual_increase_clause')==ro.index('residential_lease_source_article_08')+1 and ro.index('rental_residential_article08_tail')==ro.index('rental_residential_annual_increase_clause')+1)
res8=clauses.get('rental_residential_article08_tail',{}).get('bodyAr','')
check('res_payment_text_one_or_more','بإحدى أو أكثر من وسائل السداد' in res8)
check('res_late_comp_dynamic','{{late_payment_daily_compensation}}' in res8)
check('res_grace_days_dynamic','{{residential_payment_grace_days}}' in res8)
check('res_grace_days_positive',r.get('residential_payment_grace_days',{}).get('validation',{}).get('min')==1)
check('res_grace_starts_before_penalty','مهلة سماح' in res8 and 'اليوم التالي لانتهاء مهلة السماح' in res8)
check('res_no_undefined_payment_grace_phrase','مهلة السداد المنصوص عليها في العقد' not in res8)

# Commercial specific source behavior.
c=all_fields['commercial_lease']; co=order('commercial_lease')
for key in ['commercial_finishing_level','commercial_activity_name','annual_increase_rate','rental_payment_method','late_payment_daily_compensation']:
    check('commercial_required_'+key,c.get(key,{}).get('required') is True or (key=='annual_increase_rate' and c.get(key,{}).get('requiredWhen') is not None))
check('commercial_annual_rate_conditional',has(c.get('annual_increase_rate',{}).get('requiredWhen'),'annual_increase_enabled','truthy'))
check('commercial_single_payment_select',c.get('rental_payment_method',{}).get('type')=='select')
check('commercial_other_payment_required',has(c.get('rental_payment_method_other',{}).get('requiredWhen'),'rental_payment_method','equals','other',True))
check('commercial_early_optional',c.get('commercial_early_termination_enabled',{}).get('required') is not True)
check('commercial_early_comp_conditional',has(c.get('commercial_early_termination_compensation',{}).get('requiredWhen'),'commercial_early_termination_enabled','truthy'))
for key in ['commercial_safety_enabled','commercial_guarantee_checks_enabled','commercial_vat_enabled','commercial_public_customers_enabled','commercial_insurance_enabled','commercial_signage_enabled','commercial_legal_fees_enabled']:
    check('commercial_optional_'+key,c.get(key,{}).get('required') is not True)
for key in ['commercial_guarantee_checks_count','commercial_guarantee_bank','commercial_guarantee_check_numbers','commercial_guarantee_value_mode']:
    check('commercial_guarantee_child_'+key,has(c.get(key,{}).get('requiredWhen'),'commercial_guarantee_checks_enabled','truthy'))
check('commercial_check_each_conditional',has(c.get('commercial_guarantee_each_amount',{}).get('requiredWhen'),'commercial_guarantee_value_mode','equals','each',True))
check('commercial_check_total_conditional',has(c.get('commercial_guarantee_total_amount',{}).get('requiredWhen'),'commercial_guarantee_value_mode','equals','total',True))
check('commercial_legal_bearer_conditional',has(c.get('commercial_legal_fees_bearer',{}).get('requiredWhen'),'commercial_legal_fees_enabled','truthy'))
com_ann=clauses.get('rental_commercial_annual_increase_clause',{})
check('commercial_annual_dynamic','{{annual_increase_rate}}' in com_ann.get('bodyAr',''))
check('commercial_vat_conditional',has(clauses.get('rental_commercial_vat_clause',{}).get('visibleWhen'),'commercial_vat_enabled','truthy'))
com8=clauses.get('rental_commercial_article08_tail',{}).get('bodyAr','')
check('commercial_single_payment_wording','بإحدى وسائل السداد' in com8 and 'بإحدى أو أكثر' not in com8)
check('commercial_late_comp_dynamic','{{late_payment_daily_compensation}}' in com8)
for anchor,extra in [('commercial_lease_source_article_05','rental_commercial_early_termination_clause'),('commercial_lease_source_article_06','rental_commercial_safety_clause'),('commercial_lease_source_article_07','rental_commercial_guarantee_checks_clause'),('commercial_lease_source_article_09','rental_commercial_public_customers_clause'),('commercial_lease_source_article_10','rental_commercial_insurance_clause'),('commercial_lease_source_article_11','rental_commercial_signage_clause'),('commercial_lease_source_article_18','rental_commercial_email_notice_clause'),('commercial_lease_source_article_20','rental_commercial_legal_fees_clause')]:
    check('commercial_order_'+extra,co.index(extra)>co.index(anchor) and co.index(extra)-co.index(anchor)<=3)

# Administrative source behavior.
a=all_fields['administrative_lease']; ao=order('administrative_lease')
for key in ['administrative_activity_name','rental_payment_method']:
    check('admin_required_'+key,a.get(key,{}).get('required') is True)
check('admin_single_payment_select',a.get('rental_payment_method',{}).get('type')=='select')
check('admin_other_payment_required',has(a.get('rental_payment_method_other',{}).get('requiredWhen'),'rental_payment_method','equals','other',True))
check('admin_no_editable_annual_rate','annual_increase_rate' not in a)
check('admin_no_late_comp_amount_field','late_payment_daily_compensation' not in a)
admin_ann=clauses.get('rental_administrative_annual_increase_clause',{})
check('admin_fixed_annual_10','عشرة بالمائة (10%)' in admin_ann.get('bodyAr',''))
admin8=clauses.get('rental_administrative_article08_tail',{}).get('bodyAr','')
check('admin_fixed_seven_day_grace','سبعة (7) أيام' in admin8)
check('admin_fixed_three_x_daily','ثلاثة (3) أضعاف الأجرة اليومية' in admin8)
check('admin_no_dynamic_late_money','late_payment_daily_compensation' not in admin8)
for key in ['administrative_early_termination_enabled','administrative_safety_enabled','administrative_guarantee_checks_enabled','administrative_vat_enabled','administrative_visitors_enabled','administrative_insurance_enabled','administrative_signage_enabled','administrative_esign_enabled','administrative_legal_fees_enabled']:
    check('admin_optional_'+key,a.get(key,{}).get('required') is not True)
check('admin_early_comp_conditional',has(a.get('administrative_early_termination_compensation',{}).get('requiredWhen'),'administrative_early_termination_enabled','truthy'))
for key in ['administrative_guarantee_checks_count','administrative_guarantee_bank','administrative_guarantee_check_numbers','administrative_guarantee_value_mode']:
    check('admin_guarantee_child_'+key,has(a.get(key,{}).get('requiredWhen'),'administrative_guarantee_checks_enabled','truthy'))
check('admin_check_each_conditional',has(a.get('administrative_guarantee_each_amount',{}).get('requiredWhen'),'administrative_guarantee_value_mode','equals','each',True))
check('admin_check_total_conditional',has(a.get('administrative_guarantee_total_amount',{}).get('requiredWhen'),'administrative_guarantee_value_mode','equals','total',True))
check('admin_legal_bearer_conditional',has(a.get('administrative_legal_fees_bearer',{}).get('requiredWhen'),'administrative_legal_fees_enabled','truthy'))
check('admin_inventory_delivery_optional',a.get('administrative_delivery_condition',{}).get('required') is not True)
for stem in ['electricity','water','gas']:
    reading=a.get(f'administrative_{stem}_reading',{})
    cond=reading.get('requiredWhen')
    check(f'admin_{stem}_reading_required_if_meter_started',has(cond,f'{stem}_meter','truthy') and has(cond,f'{stem}_meter_type','truthy'))
check('admin_esign_clause_conditional',has(clauses.get('rental_administrative_esign_clause',{}).get('visibleWhen'),'administrative_esign_enabled','truthy'))
for anchor,extra in [('administrative_lease_source_article_05','rental_administrative_early_termination_clause'),('administrative_lease_source_article_06','rental_administrative_safety_clause'),('administrative_lease_source_article_07','rental_administrative_guarantee_checks_clause'),('administrative_lease_source_article_09','rental_administrative_visitors_clause'),('administrative_lease_source_article_10','rental_administrative_insurance_clause'),('administrative_lease_source_article_11','rental_administrative_signage_clause'),('administrative_lease_source_article_18','rental_administrative_email_notice_clause'),('administrative_lease_source_article_20','rental_administrative_legal_fees_clause')]:
    check('admin_order_'+extra,ao.index(extra)>ao.index(anchor) and ao.index(extra)-ao.index(anchor)<=4)

# Communications, witnesses, court semantics across variants.
for vkey,fields in all_fields.items():
    check(f'{vkey}_email_optional_parent',fields.get('rental_email_notices_enabled',{}).get('required') is not True)
    check(f'{vkey}_email_reuse_default',variants[vkey].get('defaultFieldValues',{}).get('rental_notice_use_party_emails') is True)
    for prefix in ['landlord','tenant']:
        check(f'{vkey}_{prefix}_party_email_required_if_reused',has(fields.get(f'{prefix}_email',{}).get('requiredWhen'),'rental_notice_use_party_emails','truthy'))
    for key in ['rental_notice_landlord_email','rental_notice_tenant_email']:
        check(f'{vkey}_{key}_conditional',has(fields.get(key,{}).get('requiredWhen'),'rental_notice_use_party_emails','falsy'))
    check(f'{vkey}_messaging_optional_parent',fields.get('rental_messaging_enabled',{}).get('required') is not True)
    check(f'{vkey}_messaging_channel_required',has(fields.get('rental_messaging_channel',{}).get('requiredWhen'),'rental_messaging_enabled','truthy'))
    check(f'{vkey}_other_channel_name_required',has(fields.get('rental_messaging_channel_other',{}).get('requiredWhen'),'rental_messaging_channel','equals','أخرى',True))
    for key in ['rental_messaging_landlord_phone','rental_messaging_tenant_phone']:
        check(f'{vkey}_{key}_conditional',has(fields.get(key,{}).get('requiredWhen'),'rental_messaging_use_party_phones','falsy'))
    for n in [1,2]:
        check(f'{vkey}_witness_{n}_optional',fields.get(f'rental_witness_{n}_enabled',{}).get('required') is not True)
        for suffix in ['name','national_id']:
            check(f'{vkey}_witness_{n}_{suffix}_conditional',has(fields.get(f'rental_witness_{n}_{suffix}',{}).get('requiredWhen'),f'rental_witness_{n}_enabled','truthy'))
    court=fields.get('rental_jurisdiction_court',{})
    check(f'{vkey}_jurisdiction_court_required',court.get('required') is True)
    check(f'{vkey}_jurisdiction_court_select',court.get('type')=='select' and any(o.get('value')=='القاهرة' for o in court.get('options',[])))
    check(f'{vkey}_jurisdiction_clause_active','rental_jurisdiction_court_clause' in order(vkey))
    court_text=' '.join(clauses.get(k,{}).get('bodyAr','') for k in order(vkey) if k in clauses)
    court_text=re.sub(r'\s+',' ',court_text)
    check(f'{vkey}_court_clause_uses_selected_court','تختص محكمة {{rental_jurisdiction_court}}' in court_text)

# Handover/inventory annex faithfully blank/manual and conditional.
ann=annexes.get('rental_handover_inventory_report',{})
check('handover_exists',bool(ann))
check('handover_manual_fill',ann.get('manualFillAnnex') is True)
check('handover_separate_annex',ann.get('outputMode')=='separate_annex')
check('handover_all_three_variants',set(ann.get('applicableVariantKeys',[]))==set(variants))
check('handover_required_if_furnished',has(ann.get('requiredWhen'),'residential_is_furnished','truthy'))
check('handover_required_if_admin_inventory',has(ann.get('requiredWhen'),'administrative_delivery_condition','equals','inventory_report',True))
steps={s['key']:s for s in ann.get('insertedSteps',[])}
check('handover_condition_15_rows',steps.get('rental_handover_condition',{}).get('fields',[{}])[0].get('blankRows')==15)
check('handover_access_6_rows',steps.get('rental_handover_access',{}).get('fields',[{}])[0].get('blankRows')==6)
check('handover_inventory_10_rows',steps.get('rental_handover_inventory',{}).get('fields',[{}])[0].get('blankRows')==10)
condition_labels=steps.get('rental_handover_condition',{}).get('fields',[{}])[0].get('blankRowLabels',[])
check('handover_condition_labels_15',condition_labels==['الدهانات','الأسقف','الأرضيات','الأبواب','الأقفال','الشبابيك','الزجاج','الأعمال الكهربائية','وحدات الإضاءة','أعمال السباكة','المطبخ','الحمامات','التكييفات الثابتة (إن وجدت)','السخان (إن وجد)','أخرى'])
access_labels=steps.get('rental_handover_access',{}).get('fields',[{}])[0].get('blankRowLabels',[])
check('handover_access_labels_6',access_labels==['مفتاح الباب الرئيسي','المفاتيح الداخلية','ريموت البوابة','ريموت الجراج','كارت الدخول','جهاز تحكم آخر'])
media_keys=[f['key'] for f in steps.get('rental_handover_media',{}).get('fields',[])]
for key in ['handover_photos_taken','handover_video_taken','handover_no_media','handover_general_notes','handover_copies_count']:
    check('handover_media_'+key,key in media_keys)
for vkey in variants:
    check(vkey+'_handover_user_selectable','rental_handover_inventory_report' in variants[vkey].get('allowedOptionalClauseKeys',[]))

# Clean legal bodies / dynamic finance and duration.
for vkey in variants:
    for k in order(vkey):
        cdef=clauses.get(k)
        check(f'{vkey}_clause_exists_{k}',bool(cdef and cdef.get('bodyAr')))
        if not cdef: continue
        body=cdef.get('bodyAr','')
        for bad in ['البيان المثبت بجدول بيانات العقد','عدد السنوات او الشهور','تاريخ بداية االيجار','تاريخ انتهء االيجار','المبلغ باالحرف','تعويض يومي اذا لم يخرج المستاجر']:
            check(f'{vkey}_clean_{re.sub(r"\\W+","_",bad)}_{k}',bad not in body,k)
for prefix in ['residential','commercial','administrative']:
    a5=clauses.get(f'{prefix}_lease_source_article_05',{}).get('bodyAr','')
    check(prefix+'_duration_dynamic',all(x in a5 for x in ['{{lease_duration_text}}','{{start_date}}','{{end_date}}','{{holdover_daily_compensation}}']))
    a7=clauses.get(f'{prefix}_lease_source_article_07',{}).get('bodyAr','')
    check(prefix+'_deposit_dynamic',all(x in a7 for x in ['{{deposit_amount}}','{{deposit_amount_words}}','خمسة عشر (15) يومًا']))
    a8=clauses.get(f'{prefix}_lease_source_article_08',{}).get('bodyAr','')
    check(prefix+'_rent_dynamic',all(x in a8 for x in ['{{rent_period}}','{{rent_amount}}','{{rent_amount_words}}']))

# Runtime support: TS, PHP, frontend, dashboard, PDF worker.
types=txt('packages/template-engine/src/types.ts'); val=txt('packages/template-engine/src/validation.ts'); resolver=txt('packages/template-engine/src/resolver.ts')
php=txt('backend/app/Services/TemplateEngineService.php'); front=txt('frontend/src/features/contracts/wizard/DynamicFieldRenderer.tsx'); dash=txt('dashboard/src/features/contracts/components/DynamicFieldRenderer.tsx'); optui=txt('frontend/src/features/contracts/wizard/OptionalClauseSelector.tsx'); wizard=txt('frontend/src/features/contracts/wizard/ContractWizard.tsx'); pdf=txt('backend/app/Console/Commands/ProcessDocumentJobs.php'); shared=txt('frontend/src/app/shared/[token]/page.tsx')
check('field_required_when_type','requiredWhen?: ConditionDefinition' in types)
check('repeater_required_when_type','For repeater rows' in types and 'visibleWhen?: ConditionDefinition' in types)
check('ts_field_required_when_runtime','field.requiredWhen && evaluateCondition(field.requiredWhen' in resolver)
check('ts_repeater_required_when_runtime','column.requiredWhen && evaluateCondition(column.requiredWhen, row)' in val)
check('php_field_required_when_runtime',"isset($field['requiredWhen'])" in php)
check('php_repeater_required_when_runtime',"$column['requiredWhen']" in php and "$this->evaluate" in php)
check('frontend_repeater_required_orange','column.requiredWhen && evaluateCondition(column.requiredWhen, row)' in front and '#c66b22' in front)
check('dashboard_repeater_required_orange','column.requiredWhen && evaluateCondition(column.requiredWhen, row)' in dash and '#c66b22' in dash)
check('frontend_dynamic_required_annex','clause.requiredWhen && evaluateCondition(clause.requiredWhen, fieldValues)' in optui)
check('wizard_dynamic_required_annex','requiredAnnexKeys.has(clause.key)' in wizard and 'clause.requiredWhen && evaluateCondition' in wizard)
check('backend_dynamic_required_annex','effectiveOptionalKeys' in php and "empty($clause['requiredWhen'])" in php)
check('pdf_blank_rows_support','blankRows' in pdf and 'blankRowLabels' in pdf)
check('pdf_dynamic_required_annex_support','effectiveOptionalKeys' in php)
check('shared_payment_labels',all(x in shared for x in ['rental_payment_method:','rental_payment_method_other:','rental_payment_methods:']))

# Migration publication safety.
mig6=txt('backend/database/migrations/2026_08_12_000300_publish_rental_review_v6.php')
mig7=txt('backend/database/migrations/2026_08_12_000400_publish_rental_payment_grace_v7.php')
mig8=txt('backend/database/migrations/2026_08_17_000100_publish_rental_jurisdiction_v8.php')
check('migration_v6_fresh_install_forward_compatible',"$canonicalVersion > 6" in mig6 and 'return;' in mig6)
check('migration_v7_number',"version_number', 7" in mig7 and "$canonicalVersion !== 7" in mig7)
check('migration_v7_immutable_guard','different immutable definition' in mig7)
check('migration_v7_newer_guard',"> 7" in mig7 and 'return;' in mig7)
check('migration_v7_no_rollback','rollback is intentionally disabled' in mig7)
check('migration_v8_number',"version_number', 8" in mig8 and "template_version' => 8" in mig8)
check('migration_v8_immutable_guard','different immutable definition' in mig8)
check('migration_v8_no_rollback','rollback is intentionally disabled' in mig8)

failed=[name for name,ok,_ in checks if not ok]
print(f'RENTAL CONTRACT CHECKS {len(checks)-len(failed)}/{len(checks)}')
if failed:
    print('FAILED:', '\n - '.join(['']+failed)); sys.exit(1)
