#!/usr/bin/env python3
from pathlib import Path
import json, re, sys
ROOT=Path(__file__).resolve().parents[2]

def txt(rel): return (ROOT/rel).read_text('utf-8')
def has(rel,*parts):
    s=txt(rel); return all(p in s for p in parts)
def no(rel,*parts):
    s=txt(rel); return all(p not in s for p in parts)

checks=[]
def check(key, ok, note=''):
    checks.append({'key':key,'passed':bool(ok),'note':note})

nav=txt('dashboard/src/config/adminNavigation.ts')
overview=txt('dashboard/src/app/(dashboard)/page.tsx')
settings=txt('dashboard/src/app/(dashboard)/settings/page.tsx')
pricing=txt('dashboard/src/app/(dashboard)/pricing/page.tsx')
contracts=txt('backend/app/Http/Controllers/ContractController.php')
payment=txt('backend/app/Http/Controllers/PaymentController.php')
schedule=txt('backend/app/Services/ConsultationScheduleService.php')
consult=txt('frontend/src/components/home/LegalConsultationCard.tsx')
wizard=txt('frontend/src/features/contracts/wizard/ContractWizard.tsx')
home=txt('frontend/src/app/page.tsx')
mobile=txt('frontend/src/components/layout/Navbar.tsx')
report=txt('backend/app/Http/Controllers/ReportController.php')
audit=txt('backend/app/Http/Controllers/AuditController.php')
audit_service=txt('backend/app/Services/AuditService.php')
routes=txt('backend/routes/api.php')

check('overview_static_card_removed', 'تشغيل قانوني منضبط' not in overview)
check('overview_actionable_queue_filters', all(x in overview for x in ['/work?queue=needs_attention','/work?queue=awaiting_client','/work?queue=meetings_today','/work?queue=overdue']))
check('sidebar_notifications_removed', 'href: "/notifications"' not in nav)
check('sidebar_audit_removed', 'href: "/audit"' not in nav)
check('notification_bells_poll', has('dashboard/src/components/admin/DashboardHeader.tsx','45_000','/api/v1/notifications?unreadOnly=true') and has('dashboard/src/components/admin/AdminSidebar.tsx','45_000','/api/v1/notifications?unreadOnly=true'))
check('office_contract_creation_enabled', has('dashboard/src/config/dashboardFeatures.ts','officeContractCreation: publicFlag(process.env.NEXT_PUBLIC_ENABLE_OFFICE_CONTRACT_CREATION, true)'))
check('office_contract_no_self_payment', 'استخدام داخلي للمكتب — لا توجد مطالبة دفع' in contracts and "empty($c->client_user_id)" in contracts)
check('contract_state_guard', 'assertStatusTransition' in contracts and "'approved'=>['revision_requested','in_progress','cancelled']" in contracts and "'issued'=>[" not in contracts and "'locked'=>[" not in contracts)
check('issued_revision_supported', "in_array($c->status,['locked','issued'],true)" in contracts and 'سبب إنشاء تعديل جديد مطلوب' in contracts)
check('payment_review_three_actions', all(x in payment for x in ['requestClarification','payment.approved','payment.rejected']))
check('payment_server_search_pagination', all(x in payment for x in ["$request->boolean('paginate')","'pagination'=>","p.serial_number ILIKE ?",'u.id AS "clientId"']) and has('dashboard/src/app/(dashboard)/payments/page.tsx','paginate:"1"','pagination.total','/users/${payment.clientId}'))
check('manual_collection_separate', 'payment.manual_recorded' in payment and "billing_mode'=>'external_collection'" in payment)
check('customer_contact_uses_profile', all(x in payment for x in ['clientWhatsappNumber','clientPhone','senderPhone']))
check('settings_test_email_removed', 'test-email' not in routes and 'إرسال بريد اختبار' not in settings)
check('consultation_price_moved', 'services.consultation.fee_egp' in pricing and 'سعر الاستشارة القانونية' not in settings)
check('numeric_spinner_css_removed', has('dashboard/src/app/globals.css','input[type="number"]::-webkit-inner-spin-button','-moz-appearance: textfield'))
check('settings_changed_only', 'const settings = candidates.filter' in settings or '.filter((candidate)' in settings)
check('settings_field_error_key', "settingKey" in txt('backend/app/Http/Controllers/SettingsController.php'))
check('templates_admin_route_exists', "Route::get('',[TemplateController::class,'adminIndex'])" in routes)
check('favicon_exists', (ROOT/'dashboard/src/app/favicon.ico').exists())
migration=txt('backend/database/migrations/2026_08_10_000400_dashboard_customer_workflow_hardening.php')
check('weekly_consultation_schedule', "Route::prefix('consultation-schedule')" in routes and "Route::get('consultation-availability'" in routes and 'total_capacity' in migration)
check('pending_consultation_reservation_expires', 'pendingPaymentHoldMinutes' in schedule and "$status==='pending_payment' ? now()->addMinutes($this->pendingPaymentHoldMinutes()) : null" in schedule and 'BOOKING_EXPIRED' in schedule)
check('consultation_real_availability_ui', '/api/v1/consultation-availability' in consult and 'اختر اليوم' in consult and 'selectedSlotKey' in consult)
check('customer_mobile_right_drawer', all(x in mobile for x in ['right-0','bg-[#00102e]/70','document.body.style.overflow = "hidden"']))
check('creation_mode_selected_before_catalog', all(x in home for x in ['/create-contract?mode=self_service','/create-contract?mode=lawyer_assisted','استشارة قانونية']) and not (ROOT/'frontend/src/components/home/CreationModeModal.tsx').exists())
check('customer_draft_share_payment_gated', "assertCustomerOutputUnlocked($c,'المشاركة')" in contracts and "'canShare'=>$paymentUnlocked" in contracts)
check('customer_pdf_payment_gated', "'canDownloadPdf'=>$paymentUnlocked" in contracts and "assertCustomerOutputUnlocked($c,'التنزيل')" in contracts)
check('draft_payment_backend_completeness', "if($c->status==='draft')" in payment and 'validateDraft' in payment and 'DRAFT_INCOMPLETE' in payment)
check('progress_uses_touched_fields', 'touchedFieldKeys.has(item.key)' in wizard and 'completionPercent' in wizard)
check('sale_schema_driven_validation', 'slug === "apartment_sale"' in wizard and 'saleDynamicIssues' in wizard and 'isSaleReadyForPayment' in wizard and 'is_unit_registered' not in wizard)
check('variant_technical_metadata_hidden', no('frontend/src/features/contracts/wizard/VariantSelector.tsx','صيغة مستقلة','sourceDocumentName','المصدر:'))
check('price_single_backend_source', 'ContractPricingService' in contracts and 'selfPrice($slug,$variantKey,$definition)' in contracts and 'original_price_egp' in contracts and "$definition['priceEgp']=0.0" in contracts)
check('production_price_catalog_only', 'usePublicCatalog' in home and 'usePublicCatalog' in txt('frontend/src/app/pricing/page.tsx') and 'FALLBACK_TEMPLATES' not in home and 'fallbackTemplates' not in txt('frontend/src/app/pricing/page.tsx'))
check('reports_cairo_timezone', "CarbonImmutable::now('Africa/Cairo')" in report)
check('reports_issued_at', 'issued_at>=?' in report and 'contracts_issued' in report)
check('reports_sla_unanswered', 'unanswered_over_24' in report)
check('xlsx_export', has('dashboard/src/app/(dashboard)/reports/page.tsx','downloadXlsx','تصدير التقرير Excel') and (ROOT/'dashboard/src/lib/simpleXlsx.ts').exists())
check('audit_hash_v2', 'hash_version' in audit and 'hash_version' in audit_service and 'canonicalize' in audit_service)
check('audit_verify_endpoint', "Route::get('audit/verify'" in routes and 'fullyVerified' in audit)
check('audit_pagination', "'pagination'=>" in audit and 'perPage' in txt('dashboard/src/app/(dashboard)/audit/page.tsx'))

failed=[c for c in checks if not c['passed']]
out={'status':'passed' if not failed else 'failed','passed':len(checks)-len(failed),'total':len(checks),'failed':[c['key'] for c in failed],'checks':checks}
print(json.dumps(out,ensure_ascii=False,indent=2))
sys.exit(1 if failed else 0)
