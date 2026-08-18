from pathlib import Path
import json,sys,re
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def check(name,ok,note=''):
    checks.append((name,bool(ok),note)); print(('PASS' if ok else 'FAIL'),name,note)
def txt(rel): return (ROOT/rel).read_text(encoding='utf-8')

def atomic_conditions(condition):
    if not isinstance(condition,dict): return []
    if 'all' in condition: return [i for c in condition.get('all',[]) for i in atomic_conditions(c)]
    if 'any' in condition: return [i for c in condition.get('any',[]) for i in atomic_conditions(c)]
    if 'not' in condition: return atomic_conditions(condition.get('not'))
    return [condition] if 'fieldKey' in condition else []
def has_atomic(condition,field_key,operator=None,value_marker=None,check_value=False):
    for item in atomic_conditions(condition):
        if item.get('fieldKey')!=field_key: continue
        if operator is not None and item.get('operator')!=operator: continue
        if check_value and item.get('value')!=value_marker: continue
        return True
    return False

d=json.loads(txt('backend/database/template-definitions/freelancer.json'))
check('freelancer_version_10',d.get('version')==10)
website=next((v for v in d.get('variants',[]) if v.get('key')=='website_development'),None)
check('website_variant_exists',website is not None)
steps=website.get('steps',[]) if website else []
fields={f.get('key'):f for s in steps for f in s.get('fields',[])}
field_keys=[f.get('key') for s in steps for f in s.get('fields',[]) if f.get('key')]
check('website_step_count_complete',len(steps)==9,str(len(steps)))
check('website_steps_mapped_to_contract',all(str(s.get('articleRange','')).strip() for s in steps))
check('website_no_duplicate_wizard_fields',len(field_keys)==len(set(field_keys)))
check('website_court_penultimate',bool(steps) and steps[-2].get('key')=='website_jurisdiction')

# Core main-form fields from the source.
for key in ['contract_date','website_project_name','website_project_type','website_contact_email','website_project_manager','website_approval_person','website_billing_contact','website_execution_duration_value','website_execution_duration_unit','website_duration_basis','website_total_price','website_total_price_words','website_warranty_duration_value','website_warranty_duration_unit','website_confidentiality_years']:
    check(f'required_{key}',fields.get(key,{}).get('required') is True,key)
check('old_duration_field_removed','website_execution_duration' not in fields)
check('old_currency_field_removed','website_payment_currency' not in fields)
check('price_guidance_is_contract_value','إجمالي المقابل المالي المتفق عليه' in fields.get('website_total_price',{}).get('helpText','') and 'سعر شراء' not in fields.get('website_total_price',{}).get('helpText',''))
check('price_words_present','website_total_price_words' in fields)
check('warranty_duration_dynamic',all(k in fields for k in ['website_warranty_duration_value','website_warranty_duration_unit']))
check('confidentiality_default_three',website.get('defaultFieldValues',{}).get('website_confidentiality_years')==3)

project_type_expected=['موقع تعريفي','متجر إلكتروني','منصة إلكترونية','نظام ويب (Web Application)','صفحة هبوط (Landing Page)','أخرى']
check('main_project_type_exact_source',[o.get('labelAr') for o in fields.get('website_project_type',{}).get('options',[])]==project_type_expected)
other=fields.get('website_project_type_other',{})
check('project_type_other_conditional',other.get('visibleWhen',{}).get('value')=='other' and other.get('requiredWhen',{}).get('value')=='other')

# Court is mandatory and uses the shared reviewed list.
expected_courts=['القاهرة','شمال القاهرة','جنوب القاهرة','القاهرة الجديدة','شمال الجيزة','جنوب الجيزة','الإسكندرية','طنطا','دمنهور','كفر الشيخ','المنصورة','الزقازيق','بنها','شبين الكوم','بورسعيد','الإسماعيلية','السويس','دمياط','المنيا','بني سويف','الفيوم','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','شمال سيناء','جنوب سيناء','مرسى مطروح','أخرى']
court=fields.get('website_competent_court',{})
check('court_required',court.get('required') is True)
check('court_exact_source_options',[o.get('value') for o in court.get('options',[])]==expected_courts)
check('court_other_conditional',fields.get('website_competent_court_other',{}).get('requiredWhen',{}).get('value')=='أخرى')

# Party rules: orange fields mandatory; client source has no POA row; provider does.
for prefix in ['website_client','website_provider']:
    for suffix in ['name','nationality','national_id','address','phone']:
        check(f'{prefix}_{suffix}_required',fields.get(f'{prefix}_{suffix}',{}).get('required') is True)
    for suffix in ['id_issuer','id_issue_date','email']:
        check(f'{prefix}_{suffix}_not_static_required',fields.get(f'{prefix}_{suffix}',{}).get('required') is not True)
    for suffix in ['company_name','company_legal_form','commercial_register','tax_number','legal_representative','representative_capacity','company_address','company_email']:
        f=fields.get(f'{prefix}_{suffix}',{})
        check(f'{prefix}_{suffix}_company_required',f.get('required') is True and f.get('visibleWhen',{}).get('value')=='company')
check('client_source_has_no_authority_row',all(k not in fields for k in ['website_client_authority_basis','website_client_power_of_attorney_number','website_client_power_of_attorney_year','website_client_power_of_attorney_office']))
check('provider_authority_basis_present','website_provider_authority_basis' in fields)
for k in ['website_provider_power_of_attorney_number','website_provider_power_of_attorney_year','website_provider_power_of_attorney_office']:
    f=fields.get(k,{})
    check(f'{k}_conditional_required',f.get('visibleWhen',{}).get('value')=='power_of_attorney' and f.get('requiredWhen',{}).get('value')=='power_of_attorney')

# Communications: optional parent -> dependent required, default reuse of party data.
for toggle in ['website_email_notices_enabled','website_messaging_apps_enabled','website_project_platform_enabled']:
    check(f'{toggle}_optional_control',fields.get(toggle,{}).get('required') is not True and fields.get(toggle,{}).get('printInDocument') is False)
for reuse,parent in [('website_notice_use_party_emails','website_email_notices_enabled'),('website_messaging_use_party_phones','website_messaging_apps_enabled')]:
    f=fields.get(reuse,{})
    check(f'{reuse}_reuse_control',f.get('printInDocument') is False and has_atomic(f.get('visibleWhen'),parent,'truthy'))
check('party_emails_required_only_when_reused',all(
    has_atomic(fields.get(k,{}).get('requiredWhen'),'website_email_notices_enabled','truthy') and has_atomic(fields.get(k,{}).get('requiredWhen'),'website_notice_use_party_emails','truthy')
    for k in ['website_client_email','website_provider_email']))
for k in ['website_notice_client_email','website_notice_provider_email']:
    f=fields.get(k,{})
    check(f'{k}_conditional_required',has_atomic(f.get('requiredWhen'),'website_email_notices_enabled','truthy') and has_atomic(f.get('requiredWhen'),'website_notice_use_party_emails','falsy'))
check('messaging_app_name_required_when_enabled',has_atomic(fields.get('website_messaging_apps',{}).get('requiredWhen'),'website_messaging_apps_enabled','truthy'))
for k in ['website_messaging_client_number','website_messaging_provider_number']:
    f=fields.get(k,{})
    check(f'{k}_conditional_required',has_atomic(f.get('requiredWhen'),'website_messaging_apps_enabled','truthy') and has_atomic(f.get('requiredWhen'),'website_messaging_use_party_phones','falsy'))
for k in ['website_project_platform_name','website_project_platform_link']:
    f=fields.get(k,{})
    check(f'{k}_conditional_required',has_atomic(f.get('requiredWhen'),'website_project_platform_enabled','truthy'))
check('contact_reuse_defaults',website.get('defaultFieldValues',{}).get('website_notice_use_party_emails') is True and website.get('defaultFieldValues',{}).get('website_messaging_use_party_phones') is True)

# Optional legal-fee clause and witnesses.
check('legal_fees_toggle_optional',fields.get('website_legal_fees_enabled',{}).get('required') is not True)
check('legal_fees_payer_conditional',has_atomic(fields.get('website_legal_fees_payer',{}).get('requiredWhen'),'website_legal_fees_enabled','truthy'))
check('legal_fees_other_conditional',has_atomic(fields.get('website_legal_fees_other',{}).get('requiredWhen'),'website_legal_fees_payer','equals','أخرى',True))
for n in [1,2]:
    toggle=f'website_witness_{n}_enabled'
    check(f'witness_{n}_optional',fields.get(toggle,{}).get('required') is not True and fields.get(toggle,{}).get('printInDocument') is False)
    for suffix in ['name','national_id']:
        f=fields.get(f'website_witness_{n}_{suffix}',{})
        check(f'witness_{n}_{suffix}_conditional',f.get('requiredWhen',{}).get('fieldKey')==toggle and f.get('printInDocument') is False)

# Main legal text dynamic substitutions and no invented Article 11.
clauses={c.get('key'):c for c in d.get('legalClauses',[])}
for key,vars_ in {
    'website_development_source_section_10':['{{website_execution_duration_value}}','{{website_execution_duration_unit}}','{{website_duration_basis}}'],
    'website_development_source_section_11':['{{website_total_price}}','{{website_total_price_words}}'],
    'website_development_source_section_14':['{{website_warranty_duration_value}}','{{website_warranty_duration_unit}}'],
    'website_development_source_section_16':['{{website_confidentiality_years}}'],
}.items():
    body=clauses.get(key,{}).get('bodyAr','')
    check(f'{key}_dynamic_values',all(v in body for v in vars_))
check('article_10_no_duplicate_original_price',clauses.get('website_development_source_section_11',{}).get('bodyAr','').count('10-1 قيمة العقد')==1)
article11=clauses.get('website_development_restored_section_11',{})
check('article_11_restored_with_traceable_basis',article11.get('titleAr')=='المادة الحادية عشرة: تعديل نطاق العمل وإجراءات التعديل' and 'اتفاقية التطويرات المستقبلية' in article11.get('sourceDocumentName',''))
required_keys=website.get('requiredClauseKeys',[])
check('article_11_ordered_before_12',required_keys.index('website_development_restored_section_11') < required_keys.index('website_development_source_section_12'))
check('source_original_jump_recorded',clauses.get('website_development_source_section_11',{}).get('titleAr','').startswith('المادة العاشرة') and clauses.get('website_development_source_section_12',{}).get('titleAr','').startswith('المادة الثانية عشرة'))
main_text='\n'.join(c.get('titleAr','')+'\n'+c.get('bodyAr','') for k,c in clauses.items() if k.startswith('website_development_source_'))
for bad in ['البيان المثبت بجدول بيانات العقد أو الملحق','مدة السرية بعد انتهاء العقد يفضل','(مدة الضمان)','SOWأو','WhatsAppأو','5أيام','30يو','15يو','60يو']:
    check('main_no_'+re.sub(r'\W+','_',bad).strip('_'),bad not in main_text,bad)

# Manual annex structure faithfully covers the uploaded sources.
annexes={a.get('key'):a for a in d.get('optionalClauses',[])}
minimum_steps={'website_scope_annex':8,'website_technical_annex':11,'website_project_data_annex':6,'website_delivery_annex':8,'website_sla_annex':7,'website_future_development_annex':6}
for key,min_steps in minimum_steps.items():
    a=annexes.get(key,{})
    check(f'{key}_manual_blank',a.get('manualFillAnnex') is True and a.get('outputMode')=='separate_annex')
    check(f'{key}_never_mandatory','requiredWhen' not in a)
    check(f'{key}_explicit_selection_only','اختياري بالكامل' in a.get('description','') and 'لا يُضاف تلقائيًا' in a.get('description',''))
    check(f'{key}_step_depth',len(a.get('insertedSteps',[]))>=min_steps,str(len(a.get('insertedSteps',[]))))
    legal=[clauses.get(k,{}) for k in a.get('legalClauseKeys',[])]
    check(f'{key}_no_raw_placeholder',all('البيان المثبت بجدول بيانات العقد أو الملحق' not in c.get('bodyAr','') for c in legal))

# SOW exact functional blocks.
sow={f.get('key'):f for s in annexes.get('website_scope_annex',{}).get('insertedSteps',[]) for f in s.get('fields',[])}
check('sow_six_page_rows',sow.get('website_pages',{}).get('blankRows')==6)
check('sow_four_main_function_rows',sow.get('website_main_functions',{}).get('blankRows')==4)
for k in ['website_training_mode','website_training_sessions','website_training_session_duration','website_training_method','website_acceptance_tests']:
    check(f'sow_{k}_present',k in sow)

# TS major source blocks.
ts={f.get('key'):f for s in annexes.get('website_technical_annex',{}).get('insertedSteps',[]) for f in s.get('fields',[])}
for k in ['website_architecture','website_ts_language_php','website_ts_framework_laravel','website_ts_db_mysql','website_ts_hosting','website_ts_domain','website_ts_ssl','website_ts_availability','website_ts_security_https','website_ts_env_table','website_ts_deploy_git','website_ts_repo_type','website_ts_source_delivery','website_ts_backup_frequency','website_ts_rto','website_ts_rpo','website_ts_doc_user']:
    check(f'ts_{k}_present',k in ts)
source_delivery=[o.get('value') for o in ts.get('website_ts_source_delivery',{}).get('options',[])]
check('ts_source_delivery_conflict_removed',ts.get('website_ts_source_delivery',{}).get('type')=='text' and 'الكاملة' in ts.get('website_ts_source_delivery',{}).get('labelAr',''))
check('ts_no_partial_source_delivery_field','website_ts_source_partial' not in ts)

# Project Data and DAR core tables.
pd={f.get('key'):f for s in annexes.get('website_project_data_annex',{}).get('insertedSteps',[]) for f in s.get('fields',[])}
check('project_data_contact_blank_rows',pd.get('website_pd_contact',{}).get('blankRows')==9 and all(label in pd.get('website_pd_contact',{}).get('blankRowLabels',[]) for label in ['مسؤول المشروع لدى الطرف الأول','الشخص المسؤول عن الاعتماد','الشخص المسؤول عن الفواتير أو المدفوعات']))
check('project_data_files_17_rows',len(pd.get('website_pd_files',{}).get('blankRowLabels',[]))==17)
check('project_data_content_9_rows',len(pd.get('website_pd_content',{}).get('blankRowLabels',[]))==9)
dar={f.get('key'):f for s in annexes.get('website_delivery_annex',{}).get('insertedSteps',[]) for f in s.get('fields',[])}
check('dar_tests_12_rows',len(dar.get('website_dar_tests',{}).get('blankRowLabels',[]))==12)
check('dar_punch_5_rows',dar.get('website_dar_punch_list',{}).get('blankRows')==5)
check('dar_closure_register',dar.get('website_dar_closure_register',{}).get('blankRows')==3)
check('dar_files_11_rows',len(dar.get('website_dar_files',{}).get('blankRowLabels',[]))==11)

# SLA and future-development sources are not shallow stubs anymore.
sla={f.get('key'):f for s in annexes.get('website_sla_annex',{}).get('insertedSteps',[]) for f in s.get('fields',[])}
for k in ['website_sla_start_mode','website_sla_work_days','website_sla_balance_mode','website_sla_training_mode','website_sla_fee_model','website_sla_renewal','website_sla_levels','website_sla_backup_frequency','website_sla_report_frequency']:
    check(f'sla_{k}_present',k in sla)
check('sla_levels_four_source_rows',sla.get('website_sla_levels',{}).get('blankRows')==4)
future={f.get('key'):f for s in annexes.get('website_future_development_annex',{}).get('insertedSteps',[]) for f in s.get('fields',[])}
for k in ['website_future_request_description','website_future_study_fee','website_future_study_result','website_future_offer_price','website_future_offer_validity_days','website_future_urgent','website_future_approval','website_future_start_conditions','website_future_warranty_notes','website_future_cancellation_notes']:
    check(f'future_{k}_present',k in future)
check('future_offer_validity_label_max_30','30' in future.get('website_future_offer_validity_days',{}).get('labelAr',''))

# Website contract consistency decisions: all six annexes are optional.
core_annexes=['website_scope_annex','website_technical_annex','website_project_data_annex','website_delivery_annex']
all_website_annexes=core_annexes+['website_sla_annex','website_future_development_annex']
check('website_has_no_required_annex_keys','requiredAnnexKeys' not in website)
check('all_six_annexes_user_selectable',website.get('allowedOptionalClauseKeys')==all_website_annexes)
check('all_six_annexes_never_mandatory',all('requiredWhen' not in annexes.get(k,{}) for k in all_website_annexes))
article5=clauses.get('website_development_source_section_06',{})
check('article_5_is_optional_annexes',article5.get('titleAr')=='المادة الخامسة: الملاحق الاختيارية')
check('article_5_forbids_auto_add','جميع ملاحق هذا العقد اختيارية بالكامل' in article5.get('bodyAr','') and 'لا يُضاف أي ملحق تلقائيًا' in article5.get('bodyAr',''))
check('article_5_no_old_mandatory_wording','الملاحق الأساسية' not in article5.get('bodyAr',''))
article12=clauses.get('website_development_source_section_12',{}).get('bodyAr','')
check('no_nonexistent_acceptance_criteria_annex','ملحق معايير القبول' not in article12 and 'Acceptance Criteria' not in article12)
check('acceptance_grounded_in_existing_annexes',all(x in article12 for x in ['ملحق نطاق العمل (SOW)','ملحق المواصفات الفنية (TS)','محضر التسليم والاعتماد النهائي (DAR)']))
article13=clauses.get('website_development_source_section_13',{}).get('bodyAr','')
check('source_code_full_after_payment','الشفرة المصدرية الكاملة' in article13 and 'بعد سداد' in article13)
check('portfolio_requires_prior_written_consent','موافقة كتابية مسبقة' in article13 and '13-7 عرض المشروع ضمن الأعمال السابقة' in article13)
check('portfolio_rules_consistent','ما لم يتفق الطرفان كتابةً على خلاف ذلك، يجوز للطرف الثاني' not in article13)

# Runtime enforcement/UI/PDF.
engine=txt('packages/template-engine/src/resolver.ts'); php_engine=txt('backend/app/Services/TemplateEngineService.php')
front=txt('frontend/src/features/contracts/wizard/DynamicFieldRenderer.tsx'); dash=txt('dashboard/src/features/contracts/components/DynamicFieldRenderer.tsx')
proc=txt('backend/app/Console/Commands/ProcessDocumentJobs.php'); blade=txt('backend/resources/views/pdf/contract.blade.php')
sheet=txt('frontend/src/components/contract/LegalDocumentSheet.tsx')
check('ts_required_when_runtime','field.requiredWhen && evaluateCondition(field.requiredWhen' in engine)
check('php_required_when_runtime',"isset($field['requiredWhen'])" in php_engine)
check('ts_annexes_explicit_only','variant.requiredAnnexKeys' not in engine and 'new Set(selectedOptionalClauseKeys)' in engine)
check('php_annexes_explicit_only',"$variant['requiredAnnexKeys']" not in php_engine and 'Every annex is optional' in php_engine and "array_map('strval',$selected)" in php_engine)
check('composite_conditions_both_runtimes','"all" in condition' in engine and "isset($condition['all'])" in php_engine)
check('frontend_required_orange','#c66b22' in front)
check('dashboard_required_orange','#c66b22' in dash)
check('website_full_signature_layout','identitySignatureLayout' in proc and "'website_development'" in proc)
check('website_witness_pdf_support',"'website_development'=>'website'" in proc)
check('website_project_contacts_visible_in_live_preview',all(x in sheet for x in ['مسؤول المشروع لدى الطرف الأول:','البريد المعتمد للتواصل:','الشخص المسؤول عن الاعتماد:','الشخص المسؤول عن الفواتير أو المدفوعات:']))
check('website_annex_stays_blank','annexTargetTracksField' not in sheet and 'annexAutofillValue' not in sheet and 'قالب فارغ للطباعة والتعبئة اليدوية' in sheet)
check('manual_annex_metadata_blank','قالب فارغ للتعبئة اليدوية' in blade and 'لم تُنقل إليه أي بيانات من العقد أو الـWizard' in blade)
selector=txt('frontend/src/features/contracts/wizard/OptionalClauseSelector.tsx')
check('annex_ui_all_optional','جميع الملاحق اختيارية بالكامل' in selector and 'disabled={required}' not in selector and 'أساسي — مضاف تلقائيًا' not in selector)
check('pdf_worker_renders_selected_only',"$variant['requiredAnnexKeys']" not in proc and 'Every annex is optional' in proc and "array_map('strval',$selected)" in proc)
v5migration=txt('backend/database/migrations/2026_08_12_000100_publish_freelancer_website_v5.php')
v4migration=txt('backend/database/migrations/2026_08_11_001000_publish_freelancer_visual_identity_v4.php')
check('v5_publication_migration',"version_number', 5" in v5migration and 'different immutable definition' in v5migration)
v8migration=txt('backend/database/migrations/2026_08_18_000200_publish_freelancer_preview_guidance_v8.php')
check('v8_publication_migration',"version_number', 8" in v8migration and 'different immutable definition' in v8migration)
v9migration=txt('backend/database/migrations/2026_08_18_000400_publish_blank_annex_template_versions.php')
check('v9_publication_migration',"'slug' => 'freelancer'" in v9migration and "'version' => 9" in v9migration and 'different immutable definition' in v9migration)
v10migration=txt('backend/database/migrations/2026_08_18_000500_publish_optional_annex_template_versions.php')
check('v10_publication_migration',"'slug' => 'freelancer'" in v10migration and "'version' => 10" in v10migration and 'different immutable definition' in v10migration)
check('v10_all_annexes_optional_summary','جميع ملاحق عقود العمل الحر اختيارية بالكامل' in v10migration)
check('fresh_install_v4_migration_skips_newer_canonical',"> 4" in v4migration and 'return;' in v4migration)

failed=[name for name,ok,_ in checks if not ok]
print(f'WEBSITE CONTRACT CHECKS {len(checks)-len(failed)}/{len(checks)}')
if failed:
    print('FAILED:',', '.join(failed)); sys.exit(1)
