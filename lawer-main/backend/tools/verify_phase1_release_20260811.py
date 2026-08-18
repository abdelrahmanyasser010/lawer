from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[2]
checks=[]
def check(name, cond, details=''):
    checks.append((name,bool(cond),details))

home=(root/'frontend/src/app/page.tsx').read_text()
cat=(root/'frontend/src/app/create-contract/page.tsx').read_text()
wiz=(root/'frontend/src/features/contracts/wizard/ContractWizard.tsx').read_text()
pdf=(root/'backend/resources/views/pdf/contract.blade.php').read_text()
proc=(root/'backend/app/Console/Commands/ProcessDocumentJobs.php').read_text()
sr=(root/'backend/app/Http/Controllers/ServiceRequestController.php').read_text()
pay=(root/'backend/app/Http/Controllers/PaymentController.php').read_text()
price=(root/'dashboard/src/app/(dashboard)/pricing/page.tsx').read_text()
common=(root/'packages/template-engine/src/templates/common.ts').read_text()

check('home_three_paths', all(x in home for x in ['صياغة فورية بنفسي','إعداد بواسطة محام','استشارة قانونية']))
check('old_creation_modal_not_used', 'CreationModeModal' not in '\n'.join(p.read_text(errors='ignore') for p in (root/'frontend/src').rglob('*.tsx') if p.name != 'CreationModeModal.tsx'))
check('contract_catalog_search', 'ابحث باسم العقد' in cat and 'variantMeta' in cat)
variant_keys=['residential_lease','commercial_lease','administrative_lease','preliminary_sale','registrable_sale','inherited_sale','visual_identity_design','website_development','social_media_management']
check('nine_variant_cards_supported', all(k in cat for k in variant_keys), str(variant_keys))
check('lawyer_prices_show_total_deposit_remaining', all(x in cat for x in ['السعر الكامل','العربون الآن','المتبقي']))
check('lawyer_documents_limits', 'MAX_FILES = 30' in cat and 'MAX_FILE_BYTES = 20 * 1024 * 1024' in cat and 'compressMultipleFiles' in cat and 'ارفع مستندًا واحدًا على الأقل' in cat)
check('mobile_preview_on_demand', 'MobileWizardPreview' in wiz and 'xl:hidden' in wiz and 'معاينة العقد' in wiz)
check('annex_same_pdf_wording', 'نفس ملف PDF' in (root/'frontend/src/features/contracts/wizard/OptionalClauseSelector.tsx').read_text())
check('annex_ui_zero_mandatory', 'جميع الملاحق اختيارية بالكامل' in (root/'frontend/src/features/contracts/wizard/OptionalClauseSelector.tsx').read_text() and 'لا يوجد أي ملحق إجباري' in wiz)
check('annex_bundled_in_pdf', '@foreach(($annexes ?? []) as $annex)' in pdf and 'annexes' in proc and 'page-break' in pdf)
check('contract_date_printed', 'تاريخ العقد' in pdf and 'contract_date' in proc)
check('court_common_component', 'competentCourtField' in common and 'competentCourtOptions' in common)
check('dashboard_variant_pricing', 'variantPrices' in price and 'إعداد ذاتي' in price and 'بواسطة محامي' in price and 'العربون الموحد' in price)
check('financial_snapshot_balance', all(x in sr for x in ['lawyerTotalPriceEgp','lawyerDepositEgp','outstandingEgp','paymentStage']))
check('final_delivery_waits_for_balance', 'LAWYER_BALANCE_DUE' in sr and 'awaiting_payment' in sr and 'client_review' in sr)
check('manual_payment_exact_due', 'المبلغ يجب أن يساوي' in pay or 'PAYMENT_AMOUNT' in pay, 'manual exact amount guard')

court_values=['القاهرة','شمال القاهرة','جنوب القاهرة','القاهرة الجديدة','شمال الجيزة','جنوب الجيزة','الإسكندرية','طنطا','دمنهور','كفر الشيخ','المنصورة','الزقازيق','بنها','شبين الكوم','بورسعيد','الإسماعيلية','السويس','دمياط','المنيا','بني سويف','الفيوم','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','شمال سيناء','جنوب سيناء','مرسى مطروح']
check('court_list_complete', all(v in common for v in court_values), f'{sum(v in common for v in court_values)}/{len(court_values)}')

for fn, expected_v in [('rental.json',12),('apartment_sale.json',11),('freelancer.json',10)]:
    d=json.loads((root/'backend/database/template-definitions'/fn).read_text())
    variants=d.get('variants',[])
    all_fields=[]
    for v in variants:
        f=[field.get('key') for step in v.get('steps',[]) for field in step.get('fields',[])]
        all_fields.append((v.get('key'),f))
    check(f'{fn}_version', d.get('version')==expected_v, str(d.get('version')))
    check(f'{fn}_contract_date_all_variants', all('contract_date' in fields for _,fields in all_fields), str([(k,'contract_date' in f) for k,f in all_fields]))
    court_fields=[]
    for variant in variants:
        matches=[field for step in variant.get('steps',[]) for field in step.get('fields',[]) if field.get('labelAr')=='المحكمة المختصة']
        court_fields.append((variant.get('key'),matches))
    check(f'{fn}_court_all_variants_required',all(len(matches)==1 and matches[0].get('required') is True for _,matches in court_fields),str([(key,[f.get('key') for f in matches]) for key,matches in court_fields]))
    check(f'{fn}_zero_required_annexes',all('requiredAnnexKeys' not in variant for variant in variants))
    check(f'{fn}_optional_clauses_never_mandatory',all('requiredWhen' not in annex for annex in d.get('optionalClauses',[])))

# Every separate annex in canonical defs should be manual-fill.
for slug,ts in [('rental','packages/template-engine/src/templates/rental/definition.ts'),('sale','packages/template-engine/src/templates/apartment-sale/definition.ts'),('freelancer','packages/template-engine/src/templates/freelancer/definition.ts')]:
    s=(root/ts).read_text()
    sep_count=s.count('outputMode: "separate_annex"')
    manual_count=s.count('manualFillAnnex: true')
    check(f'{slug}_annexes_manual', manual_count>=sep_count and sep_count>0, f'separate={sep_count}, manual={manual_count}')


# Cross-cutting review hardening
register=(root/'frontend/src/app/register/page.tsx').read_text()
front_validation=(root/'frontend/src/lib/inputValidation.ts').read_text()
front_reset=(root/'frontend/src/app/reset-password/page.tsx').read_text()
front_account=(root/'frontend/src/app/account/page.tsx').read_text()
verify_email=(root/'frontend/src/app/verify-email/page.tsx').read_text()
navbar=(root/'frontend/src/components/layout/Navbar.tsx').read_text()
dash_reset=(root/'dashboard/src/app/reset-password/page.tsx').read_text()
dash_account=(root/'dashboard/src/app/(dashboard)/account/page.tsx').read_text()
dash_clients=(root/'dashboard/src/app/(dashboard)/users/page.tsx').read_text()
dash_contact=(root/'dashboard/src/components/admin/CustomerContactActions.tsx').read_text()
dash_settings=(root/'dashboard/src/app/(dashboard)/settings/page.tsx').read_text()
schedule=(root/'backend/app/Services/ConsultationScheduleService.php').read_text()
hold_migration=(root/'backend/database/migrations/2026_08_11_000600_consultation_payment_hold_policy.php').read_text()
requests_page=(root/'frontend/src/app/requests/page.tsx').read_text()

check('password_policy_single_rule', all(x in front_validation for x in ['value.length >= 8 && value.length <= 128','[A-Za-z\\u0600-\\u06FF]','\\d']) and all('passwordValidationError' in x for x in [register,front_reset,front_account,dash_reset]))
check('register_field_validation_focus', all(x in register for x in ['fieldErrors','focusFirst','scrollIntoView','PasswordRequirements','phoneValidationError']))
check('phone_policy_reused_in_customer_flows', all('phoneValidationError' in (root/f).read_text() and 'normalizePhoneInput' in (root/f).read_text() for f in ['frontend/src/app/register/page.tsx','frontend/src/app/account/page.tsx','frontend/src/components/home/LegalConsultationCard.tsx','frontend/src/components/checkout/VodafoneCashModal.tsx','frontend/src/app/create-contract/page.tsx']))
check('email_verification_direct_code_ui', all(x in verify_email for x in ['^\\d{6}$','autoFocus','one-time-code','resendAfter','nextUrl']) and '/verify-email?sent=1&next=' in navbar)
check('consultation_payment_hold_expires', all(x in schedule for x in ['pendingPaymentHoldMinutes','BOOKING_EXPIRED','expires_at']) and 'UPDATE consultation_bookings SET expires_at' in hold_migration)
check('dashboard_sessions_use_camelcase', all(x in dash_account for x in ['ipAddress','userAgent','lastSeenAt','expiresAt']) and 'ip_address' not in dash_account and 'user_agent' not in dash_account)
check('client_account_type_arabic', 'individual:"فردي"' in dash_clients and 'business:"شركة"' in dash_clients)
check('client_copy_phone_feedback', all(x in dash_contact for x in ['title="نسخ الرقم"','تم نسخ الرقم','navigator.clipboard.writeText']))
check('schedule_admin_copy_and_exception_naming', 'نسخ لباقي الأيام' in dash_settings and 'إغلاق استثنائي' in dash_settings and 'إضافة إغلاق' in dash_settings)
check('requests_customer_title_generalized', ('طلباتي' in requests_page or 'سجل الطلبات' in requests_page) and 'استشاراتي' not in requests_page)
check('customer_errors_hide_backend_technology', all(term not in '\n'.join((root/f).read_text() for f in ['frontend/src/lib/apiClient.ts','frontend/src/components/checkout/VodafoneCashModal.tsx','frontend/src/components/home/LegalConsultationCard.tsx','frontend/src/components/sharing/ZShareModal.tsx','frontend/src/components/contract/ContractPdfPreview.tsx']) for term in ['Laravel','ربط المنصة بخادم الـAPI','رابط حقيقي ومحدود الصلاحية من الخادم']))

passed=sum(ok for _,ok,_ in checks)
print(f'PHASE1 CHECKS {passed}/{len(checks)}')
for name,ok,details in checks:
    print(('PASS' if ok else 'FAIL'), name, details)
if passed!=len(checks): sys.exit(1)
