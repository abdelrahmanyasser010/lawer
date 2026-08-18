from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
read = lambda p: (ROOT / p).read_text(encoding='utf-8')

routes = read('backend/routes/api.php')
service = read('backend/app/Http/Controllers/ServiceRequestController.php')
workflow = read('backend/app/Services/ServiceRequestWorkflow.php')
catalog = read('backend/app/Http/Controllers/CatalogController.php')
settings = read('backend/app/Http/Controllers/SettingsController.php')
payment = read('backend/app/Http/Controllers/PaymentController.php')
review = read('frontend/src/app/request-review/page.tsx')
customer_types = read('frontend/src/types/customer.ts')
front_pricing = read('frontend/src/app/pricing/page.tsx')
dash_pricing = read('dashboard/src/app/(dashboard)/pricing/page.tsx')
dash_nav = read('dashboard/src/config/adminNavigation.ts')
footer = read('frontend/src/components/layout/Footer.tsx')
preview = read('frontend/src/components/contract/LegalDocumentSheet.tsx')
blade = read('backend/resources/views/pdf/contract.blade.php')

checks = {}
def check(name, value): checks[name] = bool(value)

check('review_request_type_only', 'requestType: "contract_review"' in review and 'requestType: "consultation"' not in review)
check('backend_accepts_only_review_and_drafting', "in:contract_drafting,contract_review" in service and 'in:consultation' not in service)
check('review_availability_routes', "Route::get('review-availability'" in routes and "Route::prefix('review-schedule')" in routes and 'consultation-availability' not in routes and "prefix('consultation-schedule')" not in routes)
check('no_standalone_consultation_pricing_backend', 'services.consultation.fee_egp' not in catalog and 'services.consultation.fee_egp' not in settings and 'consultationFeeEgp' not in catalog)
check('dashboard_has_exact_three_service_price_keys', all(k in dash_pricing for k in ['services.contract_review.fee_egp','services.contract_review.deposit_egp','services.contract_drafting.deposit_egp']) and 'services.consultation' not in dash_pricing and len(re.findall(r'\{ key:"services\.', dash_pricing)) == 3)
check('public_types_have_no_consultation_service', 'consultationFeeEgp' not in customer_types and 'consultationDepositEgp' not in customer_types and 'reviewWhatsappNumber' in customer_types)
check('public_pricing_has_no_consultation_card', 'consultationFeeEgp' not in front_pricing and 'استشارة' not in front_pricing)
check('dashboard_navigation_has_no_consultation_item', 'href: "/consultations"' not in dash_nav and 'الاستشارات والمواعيد' not in dash_nav)
check('terms_route_exists', (ROOT/'frontend/src/app/terms/page.tsx').exists() and 'href: "/terms"' in footer and 'href="/terms"' in footer)
check('rtl_numbering_live_preview', '[unicode-bidi:isolate]' in preview and '<bdi dir="ltr"' in preview)
check('rtl_numbering_pdf', '.clause-number { direction:ltr; unicode-bidi:isolate;' in blade and '<span class="clause-number" dir="ltr">' in blade)
check('payment_approval_locks_target_state', 'PAYMENT_TARGET_STATE_CHANGED' in payment and 'FOR UPDATE' in payment)
check('review_rebooking_exists', "Route::post('{id}/rebook'" in routes and 'BOOKING_EXPIRED' in read('backend/app/Services/ConsultationScheduleService.php'))
check('service_state_machine_review_and_drafting_only', "'contract_review' => [" in workflow and "'contract_drafting' => [" in workflow and "'consultation' => [" not in workflow)
check('staff_version_preview_exists', "versions/{versionId}/preview" in routes and 'versionPreview' in read('backend/app/Http/Controllers/ContractController.php'))

court = {}
for name in ['rental','apartment_sale','freelancer']:
    data = json.loads(read(f'backend/database/template-definitions/{name}.json'))
    for variant in data['variants']:
        steps = variant.get('steps', [])
        titles = [str(s.get('titleAr','')) for s in steps]
        court_indexes = [i for i,t in enumerate(titles) if 'المحكمة المختصة' in t]
        ok = len(court_indexes) == 1 and court_indexes[0] == len(steps)-2 and ('المراجعة' in titles[-1] or 'الاعتماد' in titles[-1])
        court[f'{name}:{variant["key"]}'] = {'ok': ok, 'steps': len(steps), 'courtStep': court_indexes[0]+1 if court_indexes else None}
check('court_immediately_before_review_all_9', len(court) == 9 and all(v['ok'] for v in court.values()))

result = {
    'version': 'V30-review-only',
    'status': 'passed' if all(checks.values()) else 'failed',
    'passed': sum(checks.values()),
    'total': len(checks),
    'checks': checks,
    'courtVariants': court,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(0 if result['status']=='passed' else 1)
