from pathlib import Path
import json,sys,re
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def check(name,ok,note=''):
    checks.append((name,bool(ok),note)); print(('PASS' if ok else 'FAIL'),name,note)

def txt(rel): return (ROOT/rel).read_text(encoding='utf-8')

def atomic_conditions(condition):
    if not isinstance(condition,dict): return []
    if 'all' in condition: return [item for child in condition.get('all',[]) for item in atomic_conditions(child)]
    if 'any' in condition: return [item for child in condition.get('any',[]) for item in atomic_conditions(child)]
    if 'not' in condition: return atomic_conditions(condition.get('not'))
    return [condition] if 'fieldKey' in condition else []

def has_atomic(condition,field_key,operator=None,value_marker=object()):
    for item in atomic_conditions(condition):
        if item.get('fieldKey')!=field_key: continue
        if operator is not None and item.get('operator')!=operator: continue
        if value_marker.__class__ is not object and item.get('value')!=value_marker: continue
        return True
    return False

d=json.loads(txt('backend/database/template-definitions/freelancer.json'))
visual=next((v for v in d.get('variants',[]) if v.get('key')=='visual_identity_design'),None)
check('freelancer_current_preserves_visual',int(d.get('version',0))>=5,str(d.get('version')))
check('visual_variant_exists',visual is not None)
steps=visual.get('steps',[]) if visual else []
fields={f.get('key'):f for s in steps for f in s.get('fields',[])}

for key in ['contract_date','visual_project_name','visual_project_purpose','visual_execution_duration','visual_contract_value','visual_contract_value_words']:
    check(f'required_{key}',fields.get(key,{}).get('required') is True)
check('project_brief_optional',fields.get('visual_project_brief',{}).get('required') is not True)
check('old_target_audience_removed','visual_target_audience' not in fields)
check('old_review_rounds_removed','visual_review_rounds' not in fields)
check('contract_value_words_without_currency','بدون اسم العملة' in fields.get('visual_contract_value_words',{}).get('labelAr',''))
check('visual_self_service_no_identity_uploads',all(k not in fields for k in ['visual_client_identity_documents','visual_provider_identity_documents']))

expected_courts=['شمال القاهرة','جنوب القاهرة','القاهرة الجديدة','شمال الجيزة','جنوب الجيزة','الإسكندرية','طنطا','دمنهور','كفر الشيخ','المنصورة','الزقازيق','بنها','شبين الكوم','بورسعيد','الإسماعيلية','السويس','دمياط','المنيا','بني سويف','الفيوم','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مرسى مطروح','شمال سيناء','جنوب سيناء','أخرى']
court=fields.get('visual_competent_court',{})
check('court_optional',court.get('required') is not True)
check('court_exact_source_options',[x.get('value') for x in court.get('options',[])]==expected_courts,str([x.get('value') for x in court.get('options',[])]))
other=fields.get('visual_competent_court_other',{})
check('other_court_conditional_required',other.get('visibleWhen',{}).get('value')=='أخرى' and other.get('requiredWhen',{}).get('value')=='أخرى')

for prefix in ['visual_client','visual_provider']:
    for suffix in ['name','nationality','national_id','address','phone']:
        check(f'{prefix}_{suffix}_required',fields.get(f'{prefix}_{suffix}',{}).get('required') is True)
    for suffix in ['id_issuer','id_issue_date','email']:
        check(f'{prefix}_{suffix}_optional',fields.get(f'{prefix}_{suffix}',{}).get('required') is not True)
    for suffix in ['company_name','company_legal_form','commercial_register','tax_number','legal_representative','representative_capacity','authority_basis','company_address','company_email']:
        f=fields.get(f'{prefix}_{suffix}',{})
        check(f'{prefix}_{suffix}_company_required',f.get('required') is True and f.get('visibleWhen',{}).get('value')=='company')
    poa_keys=[f'{prefix}_power_of_attorney_number',f'{prefix}_power_of_attorney_year',f'{prefix}_power_of_attorney_office']
    check(f'{prefix}_poa_split_into_source_fields',all(k in fields for k in poa_keys) and f'{prefix}_power_of_attorney_details' not in fields)
    check(f'{prefix}_poa_conditional',all(fields[k].get('visibleWhen',{}).get('value')=='power_of_attorney' and fields[k].get('requiredWhen',{}).get('value')=='power_of_attorney' for k in poa_keys))

for toggle in ['visual_email_notices_enabled','visual_messaging_apps_enabled']:
    check(f'{toggle}_optional_control',fields.get(toggle,{}).get('required') is not True and fields.get(toggle,{}).get('printInDocument') is False)

for reuse_key in ['visual_notice_use_party_emails','visual_messaging_use_party_phones']:
    f=fields.get(reuse_key,{})
    parent='visual_email_notices_enabled' if 'notice' in reuse_key else 'visual_messaging_apps_enabled'
    check(f'{reuse_key}_reuse_control',f.get('printInDocument') is False and has_atomic(f.get('visibleWhen'),parent,'truthy'))

check('party_emails_conditional_when_reused',all(
    has_atomic(fields.get(k,{}).get('requiredWhen'),'visual_email_notices_enabled','truthy') and
    has_atomic(fields.get(k,{}).get('requiredWhen'),'visual_notice_use_party_emails','truthy')
    for k in ['visual_client_email','visual_provider_email']
))

for child in ['visual_notice_client_email','visual_notice_provider_email']:
    f=fields.get(child,{})
    check(f'{child}_conditional_required',
          has_atomic(f.get('visibleWhen'),'visual_email_notices_enabled','truthy') and
          has_atomic(f.get('visibleWhen'),'visual_notice_use_party_emails','falsy') and
          has_atomic(f.get('requiredWhen'),'visual_email_notices_enabled','truthy') and
          has_atomic(f.get('requiredWhen'),'visual_notice_use_party_emails','falsy'))

f=fields.get('visual_messaging_apps',{})
check('visual_messaging_apps_conditional_required',has_atomic(f.get('visibleWhen'),'visual_messaging_apps_enabled','truthy') and has_atomic(f.get('requiredWhen'),'visual_messaging_apps_enabled','truthy'))
for child in ['visual_messaging_client_number','visual_messaging_provider_number']:
    f=fields.get(child,{})
    check(f'{child}_conditional_required',
          has_atomic(f.get('visibleWhen'),'visual_messaging_apps_enabled','truthy') and
          has_atomic(f.get('visibleWhen'),'visual_messaging_use_party_phones','falsy') and
          has_atomic(f.get('requiredWhen'),'visual_messaging_apps_enabled','truthy') and
          has_atomic(f.get('requiredWhen'),'visual_messaging_use_party_phones','falsy'))


check('contact_reuse_defaults',
      visual.get('defaultFieldValues',{}).get('visual_notice_use_party_emails') is True and
      visual.get('defaultFieldValues',{}).get('visual_messaging_use_party_phones') is True)

for n in [1,2]:
    toggle=f'visual_witness_{n}_enabled'
    check(f'witness_{n}_optional',fields.get(toggle,{}).get('required') is not True and fields.get(toggle,{}).get('printInDocument') is False)
    for suffix in ['name','national_id']:
        f=fields.get(f'visual_witness_{n}_{suffix}',{})
        check(f'witness_{n}_{suffix}_conditional',f.get('requiredWhen',{}).get('fieldKey')==toggle and f.get('printInDocument') is False)

clause_by_key={c.get('key'):c for c in d.get('legalClauses',[])}
check('duration_clause_uses_value','{{visual_execution_duration}}' in clause_by_key.get('visual_identity_design_source_section_06',{}).get('bodyAr',''))
financial=clause_by_key.get('visual_identity_design_source_section_09',{})
check('financial_clause_uses_both_values',all(x in financial.get('bodyAr','') for x in ['{{visual_contract_value}}','{{visual_contract_value_words}}']))
contact_keys=[k for k in ['visual_identity_email_contacts','visual_identity_email_contacts_custom','visual_identity_messaging_contacts','visual_identity_messaging_contacts_custom'] if k in clause_by_key]
check('four_contact_render_paths',len(contact_keys)==4,str(contact_keys))
check('same_email_clause_uses_party_values',all(x in clause_by_key.get('visual_identity_email_contacts',{}).get('bodyAr','') for x in ['{{visual_client_email}}','{{visual_provider_email}}']))
check('same_phone_clause_uses_party_values',all(x in clause_by_key.get('visual_identity_messaging_contacts',{}).get('bodyAr','') for x in ['{{visual_client_phone}}','{{visual_provider_phone}}']))
check('dedicated_contact_fields_not_duplicated_in_data_grid',all(fields.get(k,{}).get('printInDocument') is False for k in ['visual_notice_client_email','visual_notice_provider_email','visual_messaging_apps','visual_messaging_client_number','visual_messaging_provider_number']))
check('source_fixed_three_days_clean','ثلاثة (3) أيام عمل' in clause_by_key.get('visual_identity_design_source_section_04',{}).get('bodyAr',''))
check('source_termination_numbers_clean',all(s in ' '.join(clause_by_key.get(k,{}).get('bodyAr','') for k in ['visual_identity_design_source_section_14','visual_identity_design_source_section_15','visual_identity_design_source_section_16']) for s in ['خمسة عشر (15)','عشرة (10)','سبعة (7)']))
check('reviewed_legal_titles_clean',all([
    clause_by_key.get('visual_identity_design_source_section_03',{}).get('titleAr')=='المادة الثالثة: محل العقد',
    clause_by_key.get('visual_identity_design_source_section_10',{}).get('titleAr')=='المادة العاشرة: المراجعات والتعديلات',
    clause_by_key.get('visual_identity_design_source_section_11',{}).get('titleAr')=='المادة الحادية عشرة: حقوق الملكية الفكرية وحقوق الاستخدام',
    clause_by_key.get('visual_identity_design_source_section_12',{}).get('titleAr')=='المادة الثانية عشرة: السرية وعدم الإفصاح',
    clause_by_key.get('visual_identity_design_source_section_25',{}).get('titleAr')=='ثانيًا: التسوية الودية',
]))
check('amicable_settlement_full_opening',clause_by_key.get('visual_identity_design_source_section_25',{}).get('bodyAr','').startswith('يجوز للطرفين، عند نشوء أي خلاف أو نزاع'))
identity_main_text='\n'.join((c.get('titleAr','')+'\n'+c.get('bodyAr','')) for k,c in clause_by_key.items() if k.startswith('visual_identity_design_source_section_'))
extraction_junk=['اال','إال','يلتز م','م باشرة','جز ً','قائ ً','جسي ً','الز ً','وإذاوُجدت','التعديالت','االطلاع','االستعانة']
check('main_legal_text_no_extraction_junk',not any(x in identity_main_text for x in extraction_junk),str([x for x in extraction_junk if x in identity_main_text]))
check('main_legal_source_numeric_anchors',all(x in identity_main_text for x in ['ثلاثة (3) أيام عمل','خمسة عشر (15) يومًا','عشرة (10) أيام','سبعة (7) أيام','لمدة (سنة)']))

annexes={o.get('key'):o for o in d.get('optionalClauses',[])}
annex_min_steps={'visual_identity_scope_annex':8,'visual_identity_financial_annex':7,'visual_identity_approvals_annex':8}
for key,min_steps in annex_min_steps.items():
    a=annexes.get(key,{})
    check(f'{key}_manual',a.get('manualFillAnnex') is True and a.get('outputMode')=='separate_annex')
    check(f'{key}_full_blank_layout',len(a.get('insertedSteps',[]))>=min_steps,str(len(a.get('insertedSteps',[]))))
    legal=[clause_by_key.get(k,{}) for k in a.get('legalClauseKeys',[])]
    check(f'{key}_no_raw_placeholder',all('البيان المثبت بجدول بيانات العقد أو الملحق' not in c.get('bodyAr','') for c in legal))

scope=annexes.get('visual_identity_scope_annex',{})
scope_fields={f.get('key'):f for s in scope.get('insertedSteps',[]) for f in s.get('fields',[])}
check('scope_contract_link_fields',all(k in scope_fields for k in ['visual_scope_original_contract_date','visual_scope_client_name','visual_scope_designer_name']))
manual_checkbox_keys=['visual_service_other','visual_delivery_format_other','visual_source_file_other','visual_delivery_method_other','visual_client_material_other']
check('scope_other_options_keep_checkbox',all(scope_fields.get(k,{}).get('manualCheckbox') is True for k in manual_checkbox_keys))
check('scope_outputs_12_source_rows',len(scope_fields.get('visual_outputs',{}).get('blankRowLabels',[]))==12)
check('scope_schedule_6_source_rows',len(scope_fields.get('visual_schedule',{}).get('blankRowLabels',[]))==6)
finance_annex=annexes.get('visual_identity_financial_annex',{})
finance_fields={f.get('key'):f for s in finance_annex.get('insertedSteps',[]) for f in s.get('fields',[])}
check('financial_annex_four_payments',finance_fields.get('visual_payment_schedule',{}).get('blankRows')==4)
check('financial_original_contract_date_present','visual_financial_original_contract_date' in finance_fields)
check('financial_other_options_keep_checkbox',all(finance_fields.get(k,{}).get('manualCheckbox') is True for k in ['visual_payment_method_other','visual_start_condition_other','visual_excluded_work_other','visual_suspension_reason_other']))
approvals=annexes.get('visual_identity_approvals_annex',{})
approval_fields={f.get('key'):f for s in approvals.get('insertedSteps',[]) for f in s.get('fields',[])}
check('approvals_stage_register_present','visual_stage_approvals' in approval_fields)
check('approvals_review_form_present','visual_review_round_no' in approval_fields)
check('approvals_change_form_present','visual_change_request_no' in approval_fields)
check('approvals_final_delivery_present','visual_final_delivery_date' in approval_fields)
check('approvals_ip_transfer_present','visual_ip_right_type' in approval_fields)
check('approvals_other_options_keep_checkbox',all(approval_fields.get(k,{}).get('manualCheckbox') is True for k in ['visual_final_file_other','visual_final_delivery_method_other','visual_ip_scope_other','visual_ip_exclusion_other']))

engine=txt('packages/template-engine/src/resolver.ts')
php_engine=txt('backend/app/Services/TemplateEngineService.php')
renderer=txt('frontend/src/features/contracts/wizard/DynamicFieldRenderer.tsx')
dashboard_renderer=txt('dashboard/src/features/contracts/components/DynamicFieldRenderer.tsx')
proc=txt('backend/app/Console/Commands/ProcessDocumentJobs.php')
blade=txt('backend/resources/views/pdf/contract.blade.php')
migration=txt('backend/database/migrations/2026_08_11_001000_publish_freelancer_visual_identity_v4.php')
check('ts_required_when_runtime','field.requiredWhen && evaluateCondition(field.requiredWhen' in engine)
check('ts_composite_condition_runtime','\"all\" in condition' in engine and '\"any\" in condition' in engine and '\"not\" in condition' in engine)
check('php_required_when_runtime',"isset($field['requiredWhen'])" in php_engine)
check('php_composite_condition_runtime',"isset($condition['all'])" in php_engine and "isset($condition['any'])" in php_engine and "isset($condition['not'])" in php_engine)
check('frontend_required_ui_orange','#c66b22' in renderer and 'rose-' not in '\n'.join(line for line in renderer.splitlines() if 'required' in line.lower()))
check('dashboard_required_ui_orange','#c66b22' in dashboard_renderer and 'rose-' not in '\n'.join(line for line in dashboard_renderer.splitlines() if 'required' in line.lower()))
check('required_checkbox_markers',all('aria-label="إلزامي"' in x for x in [renderer,dashboard_renderer]))
check('hidden_fields_not_printed',"evaluateCondition($field['visibleWhen']" in proc and "printInDocument" in proc)
check('manual_checkbox_rendering',"$field['manualCheckbox']" in proc and "□   ................................" in proc)
check('manual_annex_blank_metadata','قالب فارغ للتعبئة اليدوية' in blade and 'لا تُنقل إليه بيانات المستخدم تلقائيًا' in blade)
check('witness_signature_block','الشهود (إن وجدوا)' in blade and 'witnessMeta' in proc)
check('identity_signature_layout_matches_source','identitySignatureLayout' in proc and 'الصفة: ................................................' in blade and 'البصمة: ................................................' in blade)
check('v4_migration_present','version_number\', 4' in migration and 'different immutable definition' in migration and '> 4' in migration)

failed=[name for name,ok,_ in checks if not ok]
print(f'VISUAL IDENTITY CHECKS {len(checks)-len(failed)}/{len(checks)}')
if failed:
    print('FAILED:',', '.join(failed)); sys.exit(1)
