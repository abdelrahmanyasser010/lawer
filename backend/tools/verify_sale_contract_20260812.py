from pathlib import Path
import json, re, sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools'))
from template_source_runtime import load_template_definitions
checks=[]
def check(name, ok, note=''):
    checks.append((name,bool(ok),note))
    print(('PASS' if ok else 'FAIL'), name, note)
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

def has_not_company(cond,prefix):
    if not isinstance(cond,dict): return False
    n=cond.get('not')
    if isinstance(n,dict) and n.get('fieldKey')==f'{prefix}_party_type' and n.get('operator')=='equals' and n.get('value')=='company': return True
    for k in ('all','any'):
        for x in cond.get(k,[]) if isinstance(cond.get(k),list) else []:
            if has_not_company(x,prefix): return True
    return False

d=json.loads(txt('backend/database/template-definitions/apartment_sale.json'))
check('sale_version_11',d.get('version')==11)
check('sale_family_price_disabled',d.get('priceEgp')==0)
expected_variants=['preliminary_sale','registrable_sale','inherited_sale']
check('sale_three_variants_exact',[v.get('key') for v in d.get('variants',[])]==expected_variants)
check('sale_pricing_exact_variants',set(d.get('variantPricing',{}))==set(expected_variants))
for k,p in d.get('variantPricing',{}).items():
    check(f'{k}_self_price_number',isinstance(p.get('selfServicePriceEgp'),(int,float)))
    check(f'{k}_lawyer_price_number',isinstance(p.get('lawyerAssistedPriceEgp'),(int,float)))

variants={v['key']:v for v in d['variants']}
clauses={c['key']:c for c in d.get('legalClauses',[])}
annexes={a['key']:a for a in d.get('optionalClauses',[])}
def fields_for(vkey): return {f['key']:f for s in variants[vkey]['steps'] for f in s.get('fields',[])}
def step_for(vkey,key): return next((s for s in variants[vkey]['steps'] if s.get('key')==key),None)
def order(vkey): return variants[vkey].get('requiredClauseKeys',[])
all_fields={k:fields_for(k) for k in variants}

# No obsolete sale flow survives in canonical definitions.
legacy_keys={
    'sale_competent_court','sale_payment_method','sale_installment_rows','sale_installments_count',
    'sale_first_installment_date','sale_seller_id_front','sale_seller_id_back','sale_buyer_id_front',
    'sale_buyer_id_back','sale_broker_registration','sale_attachments_court','sale_property_governorate','sale_property_city'
}
for vkey,fields in all_fields.items():
    for key in sorted(legacy_keys): check(f'{vkey}_no_legacy_{key}',key not in fields)
    check(f'{vkey}_no_unexpected_court_field',all('court' not in k or k in {'inheritance_declaration_court','registered_judgment_court','sale_jurisdiction_court'} for k in fields))
    court=fields.get('sale_jurisdiction_court',{})
    check(f'{vkey}_jurisdiction_court_required',court.get('required') is True)
    check(f'{vkey}_jurisdiction_court_select',court.get('type')=='select' and any(o.get('value')=='القاهرة' for o in court.get('options',[])))

# Party rules: source orange required, blue optional, companies only where source includes them.
for vkey,fields in all_fields.items():
    allow_company=vkey in {'preliminary_sale','registrable_sale'}
    for prefix in ['seller','buyer']:
        for suffix in ['name','nationality','national_id','address','phone']:
            check(f'{vkey}_{prefix}_{suffix}_required',fields.get(f'{prefix}_{suffix}',{}).get('required') is True)
        for suffix in ['id_issuer','id_issue_date']:
            check(f'{vkey}_{prefix}_{suffix}_source_optional',fields.get(f'{prefix}_{suffix}',{}).get('required') is not True)
        email=fields.get(f'{prefix}_email',{})
        check(f'{vkey}_{prefix}_email_not_static_required',email.get('required') is not True)
        check(f'{vkey}_{prefix}_email_conditional_notice_reuse',has(email.get('requiredWhen'),'sale_email_notices_enabled','truthy') and has(email.get('requiredWhen'),'sale_notice_use_party_emails','truthy'))
        if allow_company:
            check(f'{vkey}_{prefix}_party_type_required',fields.get(f'{prefix}_party_type',{}).get('required') is True)
            check(f'{vkey}_{prefix}_party_type_ui_only',fields.get(f'{prefix}_party_type',{}).get('printInDocument') is False)
            check(f'{vkey}_{prefix}_personal_email_not_for_company_reuse',has_not_company(email.get('requiredWhen'),prefix))
            for suffix in ['company_name','company_legal_form','commercial_register','tax_card','legal_representative','representative_capacity','company_address','company_email']:
                f=fields.get(f'{prefix}_{suffix}',{})
                check(f'{vkey}_{prefix}_{suffix}_company_required',f.get('required') is True)
                check(f'{vkey}_{prefix}_{suffix}_company_visible',has(f.get('visibleWhen'),f'{prefix}_party_type','equals','company',True))
        else:
            check(f'{vkey}_{prefix}_no_party_type',f'{prefix}_party_type' not in fields)
            for suffix in ['company_name','company_legal_form','commercial_register','tax_card','legal_representative','representative_capacity','company_address','company_email']:
                check(f'{vkey}_{prefix}_no_company_{suffix}',f'{prefix}_{suffix}' not in fields)

# Contract meta: source has place/date; registrable asks copies, inherited fixes two copies in legal text.
for vkey,fields in all_fields.items():
    for key in ['contract_date','sale_contract_city']:
        check(f'{vkey}_{key}_required',fields.get(key,{}).get('required') is True)
check('preliminary_no_copies_field','sale_contract_copies_count' not in all_fields['preliminary_sale'])
check('registrable_copies_required',all_fields['registrable_sale'].get('sale_contract_copies_count',{}).get('required') is True)
check('registrable_copies_min_two',all_fields['registrable_sale'].get('sale_contract_copies_count',{}).get('validation',{}).get('min')==2)
check('inherited_two_copies_fixed_field_removed','sale_contract_copies_count' not in all_fields['inherited_sale'])
check('inherited_two_copies_fixed_clause','(2)' in clauses.get('inherited_sale_source_article_23',{}).get('bodyAr','') and 'نسختين' in clauses.get('inherited_sale_source_article_23',{}).get('bodyAr',''))

# Unit source-color rules.
required_unit=['sale_unit_governorate','sale_unit_city','sale_unit_district','sale_unit_street','sale_floor_number','sale_unit_number','sale_unit_area','sale_bedrooms_count','sale_reception_count','sale_bathrooms_count','sale_balconies_count','sale_kitchen_description','sale_finishing_level','sale_north_boundary','sale_south_boundary','sale_east_boundary','sale_west_boundary']
optional_unit=['sale_compound_name','sale_plot_number','sale_adjacency_number','sale_building_number','sale_building_name']
for vkey,fields in all_fields.items():
    for key in required_unit: check(f'{vkey}_{key}_required',fields.get(key,{}).get('required') is True)
    for key in optional_unit: check(f'{vkey}_{key}_optional',fields.get(key,{}).get('required') is not True)
    for key in ['sale_unit_area','sale_bedrooms_count','sale_reception_count','sale_bathrooms_count','sale_balconies_count']:
        check(f'{vkey}_{key}_numeric',fields.get(key,{}).get('type')=='number')

# Meters: registrable orange required; preliminary/inherited optional but completing one subfield forces the rest.
for vkey,fields in all_fields.items():
    fixed=vkey=='registrable_sale'
    for stem in ['electricity','water','gas']:
        keys=[f'sale_{stem}_meter',f'sale_{stem}_meter_type',f'sale_{stem}_meter_reading']
        for key in keys:
            if fixed:
                check(f'{vkey}_{key}_source_required',fields.get(key,{}).get('required') is True)
            else:
                f=fields.get(key,{})
                check(f'{vkey}_{key}_not_static_required',f.get('required') is not True)
                for sibling in keys:
                    check(f'{vkey}_{key}_required_when_{sibling}_started',has(f.get('requiredWhen'),sibling,'truthy'))

# Ownership sources.
p=all_fields['preliminary_sale']; r=all_fields['registrable_sale']; i=all_fields['inherited_sale']
check('preliminary_ownership_selector_required',p.get('preliminary_ownership_source',{}).get('required') is True)
check('preliminary_ownership_options_exact',[x['value'] for x in p['preliminary_ownership_source']['options']]==['preliminary_contract','custom_contract','court_judgment','allocation'])
for key,parent,value in [
    ('preliminary_contract_date','preliminary_ownership_source','preliminary_contract'),
    ('custom_contract_date','preliminary_ownership_source','custom_contract'),
    ('ownership_judgment_number','preliminary_ownership_source','court_judgment'),
    ('ownership_judgment_year','preliminary_ownership_source','court_judgment'),
    ('ownership_allocation_authority','preliminary_ownership_source','allocation')]:
    check('pre_'+key+'_conditional',p.get(key,{}).get('required') is True and has(p.get(key,{}).get('visibleWhen'),parent,'equals',value,True))
check('preliminary_title_docs_required',p.get('sale_ownership_documents',{}).get('required') is True and p.get('sale_ownership_documents',{}).get('type')=='attachment')
check('registrable_title_selector_required',r.get('registered_title_type',{}).get('required') is True)
check('registrable_title_options_exact',[x['value'] for x in r['registered_title_type']['options']]==['registered_contract','final_judgment','allocation','other'])
for key,parent,value in [
    ('registered_deed_number','registered_title_type','registered_contract'),('registered_deed_year','registered_title_type','registered_contract'),('registry_office','registered_title_type','registered_contract'),
    ('registered_judgment_number','registered_title_type','final_judgment'),('registered_judgment_year','registered_title_type','final_judgment'),('registered_judgment_court','registered_title_type','final_judgment'),
    ('registered_allocation_authority','registered_title_type','allocation'),('registered_other_title','registered_title_type','other')]:
    check('reg_'+key+'_conditional',r.get(key,{}).get('required') is True and has(r.get(key,{}).get('visibleWhen'),parent,'equals',value,True))
check('registrable_title_docs_required',r.get('sale_ownership_documents',{}).get('required') is True and r.get('sale_ownership_documents',{}).get('type')=='attachment')
for key in ['deceased_owner_name','inheritance_declaration_number','inheritance_declaration_court','inheritance_declaration_date','inheritance_disposition_basis','inheritance_no_minors_ack']:
    check('inherit_'+key+'_required',i.get(key,{}).get('required') is True)
check('inherit_basis_options_exact',[x['value'] for x in i['inheritance_disposition_basis']['options']]==['power_of_attorney','partition_contract','relinquishment_contract','sale_from_heirs','sole_heir','other'])
for key,value in [('inheritance_poa_number','power_of_attorney'),('inheritance_poa_year','power_of_attorney'),('inheritance_poa_office','power_of_attorney'),('inheritance_poa_date','power_of_attorney'),('inheritance_partition_date','partition_contract'),('inheritance_relinquishment_date','relinquishment_contract'),('inheritance_heirs_sale_date','sale_from_heirs'),('inheritance_other_basis','other')]:
    check('inherit_'+key+'_conditional',i.get(key,{}).get('required') is True and has(i.get(key,{}).get('visibleWhen'),'inheritance_disposition_basis','equals',value,True))

# Price/payment; fixed source numbers are not editable fields.
for vkey,fields in all_fields.items():
    for key in ['sale_total_price','sale_total_price_words','sale_payment_plan']:
        check(f'{vkey}_{key}_required',fields.get(key,{}).get('required') is True)
    check(f'{vkey}_payment_plan_no_default','sale_payment_plan' not in variants[vkey].get('defaultFieldValues',{}))
    for key in ['sale_down_payment','sale_remaining_amount']:
        f=fields.get(key,{})
        check(f'{vkey}_{key}_installment_required',f.get('required') is True and has(f.get('visibleWhen'),'sale_payment_plan','equals','installments',True))
check('preliminary_fixed_15_grace_not_editable','sale_installment_grace_days' not in p)
check('preliminary_fixed_15_grace_clause','خمسة عشر (15) يومًا' in clauses.get('preliminary_installment_payment_clause',{}).get('bodyAr',''))
for vkey in ['registrable_sale','inherited_sale']:
    f=all_fields[vkey].get('sale_installment_grace_days',{})
    check(f'{vkey}_grace_required',f.get('required') is True and has(f.get('visibleWhen'),'sale_payment_plan','equals','installments',True))
check('preliminary_rescission_percent_required',p.get('sale_installment_rescission_compensation_percent',{}).get('required') is True)
check('inherited_rescission_percent_required',i.get('sale_installment_rescission_compensation_percent',{}).get('required') is True)
check('registrable_no_rescission_percent','sale_installment_rescission_compensation_percent' not in r)
for vkey,fields in all_fields.items():
    for bad in ['sale_installment_rows','sale_installments_count','sale_installment_amount','sale_installment_frequency','sale_first_installment_date','sale_last_installment_date']:
        check(f'{vkey}_no_annex_data_in_wizard_{bad}',bad not in fields)

# Handover and source fixed 30-day threshold for registrable.
for vkey,fields in all_fields.items():
    check(f'{vkey}_delivery_daily_comp_required',fields.get('sale_delivery_delay_daily_compensation',{}).get('required') is True)
    check(f'{vkey}_occupied_parent_optional',fields.get('sale_unit_is_occupied',{}).get('required') is not True)
    for key in ['sale_occupancy_details','sale_occupancy_documents']:
        check(f'{vkey}_{key}_occupied_conditional',fields.get(key,{}).get('required') is True and has(fields.get(key,{}).get('visibleWhen'),'sale_unit_is_occupied','truthy'))
    check(f'{vkey}_inspection_ack_required',fields.get('sale_inspection_acknowledged',{}).get('required') is True)
check('registrable_fixed_30_threshold_not_editable','sale_delivery_delay_threshold_days' not in r)
check('registrable_full_delivery_fixed_30','ثلاثين (30) يومًا' in clauses.get('registrable_full_delivery_clause',{}).get('bodyAr',''))
check('registrable_installment_delivery_fixed_30','ثلاثين (30) يومًا' in clauses.get('registrable_installment_delivery_clause',{}).get('bodyAr',''))
for vkey in ['preliminary_sale','inherited_sale']:
    f=all_fields[vkey].get('sale_delivery_delay_threshold_days',{})
    check(f'{vkey}_delivery_threshold_required',f.get('required') is True)

# Variant-specific choices.
for key in ['preliminary_garage_status','preliminary_hidden_defect_warranty_years','preliminary_disposition_tax_payer','preliminary_reconciliation_status']:
    check('pre_special_'+key+'_required',p.get(key,{}).get('required') is True)
check('pre_garage_options_exact',[o['value'] for o in p['preliminary_garage_status']['options']]==['included','not_included'])
check('pre_tax_options_exact',[o['value'] for o in p['preliminary_disposition_tax_payer']['options']]==['seller','buyer','shared'])
for key in ['preliminary_reconciliation_request_number','preliminary_reconciliation_request_year','preliminary_reconciliation_responsible_party']:
    check('pre_reconciliation_'+key+'_conditional',p.get(key,{}).get('required') is True and has(p.get(key,{}).get('visibleWhen'),'preliminary_reconciliation_status','equals','submitted',True))
check('pre_contractual_penalty_parent_optional',p.get('preliminary_contractual_penalty_enabled',{}).get('required') is not True)
check('pre_contractual_penalty_child_conditional',p.get('preliminary_contractual_penalty_amount',{}).get('required') is True and has(p.get('preliminary_contractual_penalty_amount',{}).get('visibleWhen'),'preliminary_contractual_penalty_enabled','truthy'))
check('reg_tax_required',r.get('registrable_disposition_tax_payer',{}).get('required') is True)
check('reg_tax_options_exact',[o['value'] for o in r['registrable_disposition_tax_payer']['options']]==['seller','buyer'])
check('reg_penalty_parent_optional',r.get('registrable_contractual_penalty_enabled',{}).get('required') is not True)
check('reg_penalty_child_required_when',has(r.get('registrable_contractual_penalty_amount',{}).get('requiredWhen'),'registrable_contractual_penalty_enabled','truthy'))
check('reg_negative_cert_parent_optional',r.get('registrable_negative_certificate_enabled',{}).get('required') is not True)
check('reg_negative_cert_attachment_conditional',r.get('registrable_negative_certificate',{}).get('required') is True and has(r.get('registrable_negative_certificate',{}).get('visibleWhen'),'registrable_negative_certificate_enabled','truthy'))
check('inherit_tax_required',i.get('inherited_disposition_tax_payer',{}).get('required') is True)
check('inherit_tax_options_exact',[o['value'] for o in i['inherited_disposition_tax_payer']['options']]==['seller','buyer'])

# Notices: optional channel -> child values required; company e-mail reuses company e-mail instead of forcing blue personal e-mail.
for vkey,fields in all_fields.items():
    check(f'{vkey}_email_parent_optional',fields.get('sale_email_notices_enabled',{}).get('required') is not True)
    check(f'{vkey}_email_reuse_default_true',variants[vkey].get('defaultFieldValues',{}).get('sale_notice_use_party_emails') is True)
    for key in ['sale_notice_seller_email','sale_notice_buyer_email']:
        check(f'{vkey}_{key}_custom_required',fields.get(key,{}).get('required') is True and has(fields.get(key,{}).get('visibleWhen'),'sale_notice_use_party_emails','falsy'))
    check(f'{vkey}_messaging_parent_optional',fields.get('sale_messaging_enabled',{}).get('required') is not True)
    check(f'{vkey}_phone_reuse_default_true',variants[vkey].get('defaultFieldValues',{}).get('sale_notice_use_party_phones') is True)
    for key in ['sale_notice_seller_phone','sale_notice_buyer_phone']:
        check(f'{vkey}_{key}_custom_required',fields.get(key,{}).get('required') is True and has(fields.get(key,{}).get('visibleWhen'),'sale_notice_use_party_phones','falsy'))

# Witnesses.
for vkey,fields in all_fields.items():
    for n in [1,2]:
        check(f'{vkey}_witness_{n}_parent_optional',fields.get(f'sale_witness_{n}_enabled',{}).get('required') is not True)
        for suffix in ['name','national_id']:
            f=fields.get(f'sale_witness_{n}_{suffix}',{})
            check(f'{vkey}_witness_{n}_{suffix}_conditional',f.get('required') is True and has(f.get('visibleWhen'),f'sale_witness_{n}_enabled','truthy'))

# Supporting attachments are distinct from blank annexes.
for vkey,fields in all_fields.items():
    for key in ['sale_seller_identity_copy','sale_buyer_identity_copy']:
        check(f'{vkey}_{key}_required',fields.get(key,{}).get('required') is True and fields.get(key,{}).get('type')=='attachment')
for key in ['inheritance_declaration_attachment','deceased_death_certificate','deceased_title_document','inheritance_disposition_basis_attachment']:
    check('inherit_required_attachment_'+key,i.get(key,{}).get('required') is True and i.get(key,{}).get('type')=='attachment')
for key in ['sale_utility_receipts','sale_building_docs','sale_handover_report','sale_extra_docs']:
    if key in i: check('inherit_optional_attachment_'+key,i[key].get('required') is not True)

# Installment annex: always optional and blank/manual; no wizard data copied.
ann=annexes.get('sale_installment_schedule',{})
check('annex_exists',bool(ann))
check('annex_manual_fill_true',ann.get('manualFillAnnex') is True)
check('annex_separate_output',ann.get('outputMode')=='separate_annex')
check('annex_never_mandatory','requiredWhen' not in ann)
check('annex_never_auto_added','لا يُضاف تلقائيًا' in ann.get('description',''))
check('annex_applies_all_sale_variants',set(ann.get('applicableVariantKeys',[]))==set(expected_variants))
check('annex_no_default_field_values',not ann.get('defaultFieldValues'))
check('annex_description_blank_manual','قالب فارغ للطباعة والتعبئة اليدوية' in ann.get('description','') and 'لا تُنقل إليه بيانات الـWizard' in ann.get('description',''))
ann_steps={s['key']:s for s in ann.get('insertedSteps',[])}
check('annex_four_sections',set(ann_steps)=={'sale_installment_schedule_header','sale_installment_schedule_price','sale_installment_schedule_rows','sale_installment_schedule_signatures'})
price_keys=[f['key'] for f in ann_steps.get('sale_installment_schedule_price',{}).get('fields',[])]
for key in ['annex_manual_total_price','annex_manual_down_payment','annex_manual_remaining','annex_manual_installment_count','annex_manual_installment_amount','annex_manual_frequency','annex_manual_first_due_date','annex_manual_last_due_date']:
    check('annex_blank_price_field_'+key,key in price_keys)
rep=ann_steps.get('sale_installment_schedule_rows',{}).get('fields',[{}])[0]
check('annex_rows_repeater',rep.get('type')=='repeater')
check('annex_12_blank_rows',rep.get('blankRows')==12 and rep.get('minRows')==12)
check('annex_8_columns',len(rep.get('columns',[]))==8)
expected_cols=['installment_no','payment_method','due_date','amount','payment_date','receipt_reference','seller_receipt_signature','buyer_signature']
check('annex_columns_exact',[c.get('key') for c in rep.get('columns',[])]==expected_cols)
ann_clause=clauses.get('sale_installment_schedule_manual_clause',{})
check('annex_clause_no_variables',not ann_clause.get('variables'))
check('annex_clause_no_tokens','{{' not in ann_clause.get('bodyAr',''))
for phrase in ['طريقة السداد','أولوية سداد المبالغ','إثبات السداد','السداد المبكر','التأخر في السداد','تعديل جدول الأقساط','الإقرارات']:
    check('annex_clause_'+re.sub(r'\W+','_',phrase),phrase in ann_clause.get('bodyAr',''))
for vkey in expected_variants:
    check(f'{vkey}_annex_allowed','sale_installment_schedule' in variants[vkey].get('allowedOptionalClauseKeys',[]))

# Legal ordering and source normalization.
for vkey in expected_variants:
    o=order(vkey)
    for key in o:
        check(f'{vkey}_legal_clause_exists_{key}',key in clauses and bool(clauses[key].get('bodyAr')))
    source_text=' '.join(clauses[k].get('bodyAr','') for k in o if k in clauses)
    check(f'{vkey}_court_clause_active','sale_jurisdiction_court_clause' in o)
    check(f'{vkey}_court_clause_uses_selected_court','تختص محكمة {{sale_jurisdiction_court}}' in source_text)
    for bad in ['البيان المثبت بجدول بيانات العقد','sale_competent_court','[ ]','][','....']:
        check(f'{vkey}_clean_source_{re.sub(r"\W+","_",bad)}',bad not in source_text)
    check(f'{vkey}_signature_source_removed',not any(k.endswith('_source_article_25') or (vkey!='preliminary_sale' and k.endswith('_source_article_24')) for k in o))
check('pre_fixed_payment_inserted_after_article6',order('preliminary_sale').index('preliminary_installment_payment_clause')==order('preliminary_sale').index('preliminary_sale_source_article_06')+2)
check('reg_fixed_delivery_inserted',order('registrable_sale').index('registrable_full_delivery_clause')>order('registrable_sale').index('registrable_sale_source_article_07'))
check('inherit_generic_installment_inserted',order('inherited_sale').index('sale_installment_payment_clause')>order('inherited_sale').index('inherited_sale_source_article_06'))
pre8=clauses.get('preliminary_sale_source_article_08',{}).get('bodyAr','')
check('pre_article8_delivery_timing_normalized','تاريخ التسليم' in pre8 and 'فور توقيع هذا العقد' not in pre8)
inh13=clauses.get('inherited_sale_source_article_13',{}).get('bodyAr','')
check('inherit_article13_no_false_signing_delivery','حيازته اعتبارًا من توقيع' not in inh13 and 'وفق المادة السابعة' in inh13)
inh18=clauses.get('inherited_sale_source_article_18',{}).get('bodyAr','')
check('inherit_article18_risk_from_delivery','تاريخ التسليم' in inh18 and 'اعتبارًا من تاريخ توقيع هذا العقد' not in inh18)

# No fake/default business values except pure control defaults.
allowed_defaults={
    'sale_email_notices_enabled','sale_notice_use_party_emails','sale_messaging_enabled','sale_notice_use_party_phones',
    'sale_witness_1_enabled','sale_witness_2_enabled','sale_unit_is_occupied','sale_inspection_acknowledged','registrable_contractual_penalty_enabled'
}
for vkey,v in variants.items():
    defaults=set(v.get('defaultFieldValues',{}))
    check(f'{vkey}_defaults_only_ui_controls',defaults<=allowed_defaults,','.join(sorted(defaults-allowed_defaults)))
    for forbidden in ['seller_party_type','buyer_party_type','seller_nationality','buyer_nationality','sale_payment_plan','preliminary_ownership_source','registered_title_type','inheritance_disposition_basis','preliminary_disposition_tax_payer','registrable_disposition_tax_payer','inherited_disposition_tax_payer','preliminary_garage_status','preliminary_reconciliation_status']:
        check(f'{vkey}_no_fake_default_{forbidden}',forbidden not in v.get('defaultFieldValues',{}))

# Runtime / frontend / backend / PDF blank-annex behavior.
types=txt('packages/template-engine/src/types.ts')
val=txt('packages/template-engine/src/validation.ts')
resolver=txt('packages/template-engine/src/resolver.ts')
php=txt('backend/app/Services/TemplateEngineService.php')
worker=txt('backend/app/Console/Commands/ProcessDocumentJobs.php')
pdf=txt('backend/resources/views/pdf/contract.blade.php')
front=txt('frontend/src/features/contracts/wizard/ContractWizard.tsx')
optui=txt('frontend/src/features/contracts/wizard/OptionalClauseSelector.tsx')
shared=txt('frontend/src/app/shared/[token]/page.tsx')
demo=txt('frontend/src/lib/demoApi.ts')
check('types_manual_annex_support','manualFillAnnex?: boolean' in types and 'requiredWhen?: ConditionDefinition' in types)
check('ts_rejects_annex_on_full','sale_installment_schedule' in val and 'sale_payment_plan !== "installments"' in val)
check('ts_validates_sale_arithmetic','sale_total_price' in val and 'sale_down_payment' in val and 'sale_remaining_amount' in val)
check('php_rejects_annex_on_full','ملحق جدول الأقساط يُستخدم فقط عند اختيار السداد بالتقسيط' in php)
check('php_validates_sale_arithmetic','إجمالي الثمن يجب أن يساوي الدفعة المقدمة + باقي الثمن' in php)
check('php_skips_annex_only_validation','manualFillAnnex are printed as blank templates and excluded from wizard validation' in php)
check('php_selected_annexes_only','Every annex is optional' in php and "array_map('strval',$selected)" in php and 'requiredAnnexKeys' not in php)
check('worker_selected_annexes_only','Every annex is optional' in worker and "array_map('strval',$selected)" in worker and 'requiredAnnexKeys' not in worker)
check('worker_blank_sections_manual','buildBlankSections' in worker and "manualFillAnnex" in worker)
check('worker_appends_annex_to_main_pdf',"$annexes[]" in worker and "'annexes'=>$annexes" in worker)
check('pdf_manual_annex_meta_blank',"$manualStandaloneAnnex" in pdf and 'تابع للعقد رقم: <span class="ltr">................................</span>' in pdf)
check('pdf_manual_annex_names_blank',"$manualStandaloneAnnex ? '................................................'" in pdf)
check('pdf_manual_annex_capacity_blank',"($annex['manualFill'] ?? false) ? '................................................'" in pdf)
check('pdf_manual_annex_note','هذا الملحق قالب فارغ' in pdf and 'لم تُدرج فيه بيانات المستخدم تلقائيًا' in pdf)
check('frontend_sale_schema_branch','if (slug === "apartment_sale")' in front and 'DynamicOptionalStep' in front and 'validateDynamicDefinition' in front)
check('frontend_sale_annex_blank_message','قالب فارغ للطباعة' in front and 'لا تُنقل إليه بيانات الـWizard' in front and 'يستكمله المستخدم يدويًا' in front)
check('frontend_no_legacy_sale_keys',not any(k in front for k in legacy_keys))
check('shared_page_current_payment_key','sale_payment_plan' in shared and 'sale_payment_method' not in shared and 'sale_competent_court' not in shared)
check('demo_current_payment_key','sale_payment_plan: "full"' in demo and 'sale_payment_method' not in demo)
check('optional_selector_hides_annex_for_full','clause.key !== "sale_installment_schedule" || fieldValues.sale_payment_plan === "installments"' in optui)
check('optional_selector_never_locks_annex','disabled={required}' not in optui and 'جميع الملاحق اختيارية بالكامل' in optui)

# Migration / canonical / engine compiled equality.
mig=ROOT/'backend/database/migrations/2026_08_12_000500_publish_apartment_sale_review_v6.php'
check('sale_migration_exists',mig.is_file())
if mig.is_file():
    m=mig.read_text(encoding='utf-8')
    check('sale_migration_version6',"version_number', 6" in m and "template_version' => 6" in m)
    check('sale_migration_immutable_guard','already exists with a different immutable definition' in m)
    check('sale_migration_v6_newer_guard',"> 6" in m and 'return;' in m)
    check('sale_migration_no_rollback','rollback is intentionally disabled' in m)
new_mig=ROOT/'backend/database/migrations/2026_08_17_000200_publish_apartment_sale_jurisdiction_v7.php'
check('sale_migration_v7_exists',new_mig.is_file())
if new_mig.is_file():
    m=new_mig.read_text(encoding='utf-8')
    check('sale_migration_v7_number',"version_number', 7" in m and "template_version' => 7" in m)
    check('sale_migration_v7_immutable_guard','already exists with a different immutable definition' in m)
    check('sale_migration_v7_newer_guard',"$canonicalVersion > 7" in m and 'return;' in m)
    check('sale_migration_v7_no_rollback','rollback is intentionally disabled' in m)
integrity_mig=ROOT/'backend/database/migrations/2026_08_18_000100_publish_contract_integrity_versions.php'
check('sale_migration_v8_exists',integrity_mig.is_file())
if integrity_mig.is_file():
    m=integrity_mig.read_text(encoding='utf-8')
    check('sale_migration_v8_number',"'slug' => 'apartment_sale'" in m and "'version' => 8" in m)
    check('sale_migration_v8_newer_guard',"$canonicalVersion > $specification['version']" in m)
latest_mig=ROOT/'backend/database/migrations/2026_08_18_000300_publish_rental_sale_text_integrity_versions.php'
check('sale_migration_v9_exists',latest_mig.is_file())
if latest_mig.is_file():
    m=latest_mig.read_text(encoding='utf-8')
    check('sale_migration_v9_number',"'slug' => 'apartment_sale'" in m and "'version' => 9" in m)
    check('sale_migration_v9_immutable_guard','different immutable definition' in m)
    check('sale_migration_v9_no_rollback','rollback is intentionally disabled' in m)
blank_annex_mig=ROOT/'backend/database/migrations/2026_08_18_000400_publish_blank_annex_template_versions.php'
check('sale_migration_v10_exists',blank_annex_mig.is_file())
if blank_annex_mig.is_file():
    m=blank_annex_mig.read_text(encoding='utf-8')
    check('sale_migration_v10_number',"'slug' => 'apartment_sale'" in m and "'version' => 10" in m)
    check('sale_migration_v10_immutable_guard','different immutable definition' in m)
    check('sale_migration_v10_no_rollback','rollback is intentionally disabled' in m)
optional_annex_mig=ROOT/'backend/database/migrations/2026_08_18_000500_publish_optional_annex_template_versions.php'
check('sale_migration_v11_exists',optional_annex_mig.is_file())
if optional_annex_mig.is_file():
    m=optional_annex_mig.read_text(encoding='utf-8')
    check('sale_migration_v11_number',"'slug' => 'apartment_sale'" in m and "'version' => 11" in m)
    check('sale_migration_v11_optional_summary','ملحق جدول الأقساط اختياريًا بالكامل' in m)
    check('sale_migration_v11_immutable_guard','different immutable definition' in m)
    check('sale_migration_v11_no_rollback','rollback is intentionally disabled' in m)
try:
    engine_definition=load_template_definitions(ROOT)['apartment_sale']
    check('canonical_equals_compiled_engine',engine_definition==d)
except Exception as exc:
    check('canonical_equals_compiled_engine',False,str(exc))

# Global canonical sanity: field keys unique per variant, clause keys unique, variables are actually present as tokens.
check('legal_clause_keys_unique',len(clauses)==len(d.get('legalClauses',[])))
for vkey,v in variants.items():
    keys=[f['key'] for s in v['steps'] for f in s.get('fields',[])]
    check(f'{vkey}_field_keys_unique',len(keys)==len(set(keys)))
    check(f'{vkey}_step_keys_unique',len(v['steps'])==len({s['key'] for s in v['steps']}))
    check(f'{vkey}_allowed_annex_exact',v.get('allowedOptionalClauseKeys')==['sale_installment_schedule'])
for key,c in clauses.items():
    for var in c.get('variables',[]) or []:
        check(f'clause_{key}_token_{var}',('{{'+var+'}}') in c.get('bodyAr',''))

failed=[x for x in checks if not x[1]]
print(f'\nSALE CHECKS: {len(checks)-len(failed)}/{len(checks)} passed')
if failed:
    print('\nFAILED:')
    for x in failed: print('-',x[0],x[2])
    sys.exit(1)
