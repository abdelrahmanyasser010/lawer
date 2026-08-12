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
check('freelancer_version_6',d.get('version')==6)
social=next((v for v in d.get('variants',[]) if v.get('key')=='social_media_management'),None)
check('social_variant_exists',social is not None)
steps=social.get('steps',[]) if social else []
fields={f.get('key'):f for s in steps for f in s.get('fields',[])}
clauses={c.get('key'):c for c in d.get('legalClauses',[])}

# Party source colors + company/POA conditionals for both sides.
for prefix in ['social_client','social_provider']:
    for suffix in ['name','nationality','national_id','address','phone']:
        check(f'{prefix}_{suffix}_required',fields.get(f'{prefix}_{suffix}',{}).get('required') is True)
    for suffix in ['id_issuer','id_issue_date']:
        check(f'{prefix}_{suffix}_optional',fields.get(f'{prefix}_{suffix}',{}).get('required') is not True)
    for suffix in ['company_name','company_legal_form','commercial_register','tax_number','legal_representative','representative_capacity','authority_basis','company_address','company_email']:
        f=fields.get(f'{prefix}_{suffix}',{})
        check(f'{prefix}_{suffix}_company_required',f.get('required') is True and f.get('visibleWhen',{}).get('value')=='company')
    for suffix in ['power_of_attorney_number','power_of_attorney_year','power_of_attorney_office']:
        f=fields.get(f'{prefix}_{suffix}',{})
        check(f'{prefix}_{suffix}_poa_required',f.get('requiredWhen',{}).get('value')=='power_of_attorney' and f.get('visibleWhen',{}).get('value')=='power_of_attorney')
check('legacy_poa_blob_removed',all(k not in fields for k in ['social_client_power_of_attorney_details','social_provider_power_of_attorney_details']))

# Main service data. Web project-type copy/paste source error must not be implemented.
for key in ['social_project_name','social_business_nature','social_target_market','social_target_audience','social_managed_platforms','social_scope_summary','social_contact_email','social_project_manager','social_approval_person','social_billing_contact','social_contract_duration','social_fee_nature','social_fee','social_fee_words']:
    check(f'required_{key}',fields.get(key,{}).get('required') is True,key)
check('brand_name_optional',fields.get('social_brand_name',{}).get('required') is not True)
check('project_brief_optional',fields.get('social_project_brief',{}).get('required') is not True)
check('wrong_web_project_type_field_absent','social_project_type' not in fields and 'website_project_type' not in fields)
project_clause=clauses.get('social_media_management_source_section_02',{}).get('bodyAr','')
for bad in ['موقع تعريفي','متجر إلكتروني','Web Application','Landing Page']:
    check('main_project_clause_excludes_'+re.sub(r'\W+','_',bad).strip('_'),bad not in project_clause,bad)
check('main_project_clause_explicit_social_scope','إدارة حسابات ومنصات التواصل الاجتماعي' in project_clause and 'المنصات والحسابات المشمولة' in project_clause)

# Commercial terms.
check('fee_is_contract_value','سعر شراء' in fields.get('social_fee',{}).get('helpText',''))
check('fee_nature_exact_options',[o.get('value') for o in fields.get('social_fee_nature',{}).get('options',[])]==['إجمالي','دوري'])
check('article_9_duration_dynamic','{{social_contract_duration}}' in clauses.get('social_media_management_source_section_10',{}).get('bodyAr',''))
article10=clauses.get('social_media_management_source_section_11',{}).get('bodyAr','')
check('article_10_fee_dynamic',all(v in article10 for v in ['{{social_fee_nature}}','{{social_fee}}','{{social_fee_words}}']))
check('article_10_single_value_clause',article10.count('10-1 قيمة المقابل المالي')==1)

# Article 14 delay penalty: one of amount/percentage, cap always required.
mode=fields.get('social_delay_penalty_mode',{})
check('delay_penalty_mode_required',mode.get('required') is True)
check('delay_penalty_mode_two_options',[o.get('value') for o in mode.get('options',[])]==['amount','percentage'])
amount=fields.get('social_delay_penalty_amount',{})
percent=fields.get('social_delay_penalty_percentage',{})
cap=fields.get('social_delay_penalty_cap_percentage',{})
check('delay_amount_conditional',amount.get('requiredWhen',{}).get('value')=='amount' and amount.get('visibleWhen',{}).get('value')=='amount')
check('delay_percentage_conditional',percent.get('requiredWhen',{}).get('value')=='percentage' and percent.get('visibleWhen',{}).get('value')=='percentage')
check('delay_cap_required',cap.get('required') is True)
check('delay_percentage_bounds',percent.get('validation',{}).get('max')==100 and percent.get('validation',{}).get('min')==0.01)
check('delay_cap_bounds',cap.get('validation',{}).get('max')==100 and cap.get('validation',{}).get('min')==0.01)
req=social.get('requiredClauseKeys',[])
check('raw_article_14_not_required','social_media_management_source_section_16' not in req)
article14keys=['social_media_management_article_14_intro','social_media_delay_penalty_amount_clause','social_media_delay_penalty_percentage_clause','social_media_management_article_14_tail']
check('article_14_split_order',all(k in req for k in article14keys) and [req.index(k) for k in article14keys]==sorted(req.index(k) for k in article14keys))
amount_clause=clauses.get('social_media_delay_penalty_amount_clause',{})
percent_clause=clauses.get('social_media_delay_penalty_percentage_clause',{})
check('amount_clause_condition',amount_clause.get('visibleWhen',{}).get('value')=='amount')
check('percentage_clause_condition',percent_clause.get('visibleWhen',{}).get('value')=='percentage')
check('amount_clause_variables',all(v in amount_clause.get('bodyAr','') for v in ['{{social_delay_penalty_amount}}','{{social_delay_penalty_cap_percentage}}']))
check('percentage_clause_variables',all(v in percent_clause.get('bodyAr','') for v in ['{{social_delay_penalty_percentage}}','{{social_delay_penalty_cap_percentage}}']))
for k in ['social_media_management_article_14_intro','social_media_management_article_14_tail']:
    check(k+'_nonempty',len(clauses.get(k,{}).get('bodyAr',''))>300)
check('article_14_notice_fixed_five_days','خمسة (5) أيام عمل' in amount_clause.get('bodyAr','') and 'خمسة (5) أيام عمل' in percent_clause.get('bodyAr',''))

# Court exact source list and optional fallback.
expected_courts=['شمال القاهرة','جنوب القاهرة','القاهرة الجديدة','شمال الجيزة','جنوب الجيزة','الإسكندرية','طنطا','دمنهور','كفر الشيخ','المنصورة','الزقازيق','بنها','شبين الكوم','بورسعيد','الإسماعيلية','السويس','دمياط','المنيا','بني سويف','الفيوم','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مرسى مطروح','شمال سيناء','جنوب سيناء','أخرى']
court=fields.get('social_competent_court',{})
check('court_optional',court.get('required') is not True)
check('court_exact_options',[o.get('value') for o in court.get('options',[])]==expected_courts)
check('court_other_conditional',fields.get('social_competent_court_other',{}).get('requiredWhen',{}).get('value')=='أخرى')
check('court_clause_has_fallback','عدم تحديد محكمة بعينها' in clauses.get('social_media_management_source_section_23',{}).get('bodyAr',''))

# Communications: Article 20-3 prints e-mail and phone contacts in orange, so contact data cannot be disabled.
check('email_notice_disable_toggle_removed','social_email_notices_enabled' not in fields)
check('messaging_disable_toggle_removed','social_messaging_apps_enabled' not in fields and 'social_messaging_apps' not in fields)
check('email_reuse_control',fields.get('social_notice_use_party_emails',{}).get('printInDocument') is False)
check('phone_reuse_control',fields.get('social_messaging_use_party_phones',{}).get('printInDocument') is False)
check('email_reuse_default',social.get('defaultFieldValues',{}).get('social_notice_use_party_emails') is True)
check('phone_reuse_default',social.get('defaultFieldValues',{}).get('social_messaging_use_party_phones') is True)
for k in ['social_client_email','social_provider_email']:
    f=fields.get(k,{})
    check(f'{k}_required_when_reused',has_atomic(f.get('requiredWhen'),'social_notice_use_party_emails','truthy'))
for k in ['social_notice_client_email','social_notice_provider_email']:
    f=fields.get(k,{})
    check(f'{k}_conditional',has_atomic(f.get('requiredWhen'),'social_notice_use_party_emails','falsy'))
for k in ['social_messaging_client_number','social_messaging_provider_number']:
    f=fields.get(k,{})
    check(f'{k}_conditional',has_atomic(f.get('requiredWhen'),'social_messaging_use_party_phones','falsy'))
for k in ['social_media_email_contacts','social_media_email_contacts_custom','social_media_messaging_contacts','social_media_messaging_contacts_custom']:
    check(k+'_required_key',k in req)
check('article_20_contact_data_mandatory_semantics','إذا تم اعتماده' not in clauses.get('social_media_management_source_section_22',{}).get('bodyAr','') and 'بيانات الاتصال المعتمدة' in clauses.get('social_media_management_source_section_22',{}).get('bodyAr',''))

# Optional legal fee clause and witnesses.
check('legal_fee_toggle_optional',fields.get('social_legal_fees_enabled',{}).get('required') is not True)
check('legal_fee_dynamic_clause','social_media_legal_fees_clause' in req and clauses.get('social_media_legal_fees_clause',{}).get('visibleWhen',{}).get('operator')=='truthy')
check('core_article_22_excludes_optional_fee','22-16' not in clauses.get('social_media_management_source_section_24',{}).get('bodyAr',''))
for n in [1,2]:
    toggle=f'social_witness_{n}_enabled'
    check(f'witness_{n}_optional',fields.get(toggle,{}).get('required') is not True and fields.get(toggle,{}).get('printInDocument') is False)
    for suffix in ['name','national_id']:
        f=fields.get(f'social_witness_{n}_{suffix}',{})
        check(f'witness_{n}_{suffix}_conditional',f.get('requiredWhen',{}).get('fieldKey')==toggle and f.get('printInDocument') is False)

# Source contradictions and fixed source values.
check('confidentiality_fixed_three_years','ثلاث (3) سنوات' in clauses.get('social_media_management_source_section_18',{}).get('bodyAr',''))
check('portfolio_requires_prior_written_consent','موافقة كتابية مسبقة' in clauses.get('social_media_management_source_section_15',{}).get('bodyAr',''))
check('portfolio_confidentiality_consistent','موافقة كتابية مسبقة' in clauses.get('social_media_management_source_section_18',{}).get('bodyAr',''))
check('article_22_copies_no_blank_count','22-11 عدد النسخ' in clauses.get('social_media_management_source_section_24',{}).get('bodyAr','') and 'عدد )' not in clauses.get('social_media_management_source_section_24',{}).get('bodyAr',''))

# Social annexes are source-listed as optional but authoritative PDFs were not supplied; do not expose drafts.
check('unverified_social_annexes_disabled',social.get('allowedOptionalClauseKeys')==[])
for akey in ['social_media_scope_annex','social_media_financial_annex']:
    annex=next((a for a in d.get('optionalClauses',[]) if a.get('key')==akey),None)
    if annex:
        check(akey+'_not_customer_selectable',akey not in social.get('allowedOptionalClauseKeys',[]))

# No raw placeholders in any required main-clause output.
for k in req:
    c=clauses.get(k,{})
    check('required_clause_exists_'+k,bool(c.get('titleAr')) and bool(c.get('bodyAr')))
    body=(c.get('titleAr','')+'\n'+c.get('bodyAr',''))
    bad=any(x in body for x in ['البيان المثبت بجدول بيانات العقد أو الملحق','البيان المعتمد في صدر العقد','.....'])
    check('required_clause_clean_'+k,not bad,k)

# Runtime/UI/PDF support.
engine=txt('packages/template-engine/src/resolver.ts'); php_engine=txt('backend/app/Services/TemplateEngineService.php')
front=txt('frontend/src/features/contracts/wizard/DynamicFieldRenderer.tsx'); dash=txt('dashboard/src/features/contracts/components/DynamicFieldRenderer.tsx')
proc=txt('backend/app/Console/Commands/ProcessDocumentJobs.php')
check('ts_required_when_runtime','field.requiredWhen && evaluateCondition(field.requiredWhen' in engine)
check('php_required_when_runtime',"isset($field['requiredWhen'])" in php_engine)
check('composite_conditions_runtime','"all" in condition' in engine and "isset($condition['all'])" in php_engine)
check('frontend_required_orange','#c66b22' in front)
check('dashboard_required_orange','#c66b22' in dash)
check('social_signature_layout',"'social_media_management'" in proc and 'identitySignatureLayout' in proc)
check('social_witness_pdf',"'social_media_management'=>'social'" in proc)
check('social_no_self_service_attachments','social_account_access_attachment' not in fields and 'social_brand_assets_attachment' not in fields)

# Publication migration.
mig=txt('backend/database/migrations/2026_08_12_000200_publish_freelancer_social_media_v6.php')
check('v6_migration_exists',"version_number', 6" in mig and 'different immutable definition' in mig)
check('v6_migration_mentions_penalty','الجزاء الاتفاقي الشرطي' in mig)
check('v6_migration_newer_guard',"> 6" in mig and 'return;' in mig)

failed=[name for name,ok,_ in checks if not ok]
print(f'SOCIAL MEDIA CONTRACT CHECKS {len(checks)-len(failed)}/{len(checks)}')
if failed:
    print('FAILED:',', '.join(failed)); sys.exit(1)
