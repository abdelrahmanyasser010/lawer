#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def check(key, ok, note=''):
    checks.append((key,bool(ok),note))
    print(('PASS ' if ok else 'FAIL ')+key+(f' :: {note}' if note else ''))
def text(rel): return (ROOT/rel).read_text(encoding='utf-8')
def data(rel): return json.loads(text(rel))

contract=text('backend/app/Http/Controllers/ContractController.php')
payment=text('backend/app/Http/Controllers/PaymentController.php')
service=text('backend/app/Http/Controllers/ServiceRequestController.php')
attach=text('backend/app/Http/Controllers/AttachmentController.php')
worker=text('backend/app/Console/Commands/ProcessDocumentJobs.php')
engine=text('backend/app/Services/TemplateEngineService.php')
routes=text('backend/routes/api.php')
page=text('frontend/src/app/contract/[id]/page.tsx')
types=text('frontend/src/types/customer.ts')
demo=text('frontend/src/lib/demoApi.ts')
pricing=text('backend/app/Services/ContractPricingService.php')

# Customer issuance/payment boundary
check('finalize_self_service_only', "SELF_SERVICE_FINALIZATION_ONLY" in contract and "$c->creation_mode!=='self_service'" in contract)
check('finalize_requires_billing_settled', re.search(r'public function finalize\b[^\n]+assertBillingSettled\(\$c\)',contract) is not None)
check('finalize_requires_client_review', "CONTRACT_NOT_READY_FOR_FINALIZATION" in contract and "$c->status!=='client_review'" in contract)
check('finalize_verified_email', 'public function finalize' in contract and '$this->verified($auth)' in contract)
check('finalize_owner_only', 'إصدار النسخة النهائية متاح لصاحب العقد فقط' in contract)
check('finalize_early_confirmation', 'EARLY_FINALIZATION_CONFIRMATION_REQUIRED' in contract)
check('backend_exposes_can_finalize', "'canFinalize'=>$canFinalize" in contract)
check('backend_can_finalize_paid_self_review', "$canFinalize=$isOwner&&$c->creation_mode==='self_service'&&$c->status==='client_review'&&$paymentUnlocked" in contract)
check('frontend_uses_can_finalize_early', 'item.permissions.canFinalize && <button' in page)
check('frontend_uses_can_finalize_expired', 'item.permissions.canFinalize && !item.editWindow.active' in page)
check('frontend_contract_type_can_finalize', 'canFinalize: boolean;' in types)
check('demo_contract_can_finalize_shape', 'canFinalize: isRental' in demo)

# Variant immutability / pricing snapshot integrity
check('customer_variant_immutable', 'CONTRACT_VARIANT_CHANGE_REQUIRES_NEW_DRAFT' in contract and 'تغيير نوع العقد يتطلب بدء مسودة جديدة' in contract)
check('staff_variant_immutable', contract.count('CONTRACT_VARIANT_CHANGE_REQUIRES_NEW_DRAFT') >= 2)
check('price_snapshot_saved_on_create', 'original_price_egp' in contract and '$contractPrice' in contract)
check('customer_contract_price_server_side', '$this->pricing->selfPrice($slug,$variantKey,$definition)' in contract)
check('lawyer_price_server_side', '$this->pricing->lawyerPrice($slug,$variantKey,$definition)' in service)
check('no_customer_lawyer_direct_contract', 'LAWYER_ASSISTED_REQUIRES_SERVICE_REQUEST' in contract)
check('lawyer_contract_requires_documents', 'CONTRACT_DOCUMENTS_REQUIRED' in service and 'if(!$attachmentIds)' in service)
check('lawyer_price_must_be_configured', 'LAWYER_PRICE_NOT_CONFIGURED' in service)

# Self service edit/revision window boundary
check('self_service_revision_reopen_blocked', 'SELF_SERVICE_REVISION_REQUEST_NOT_ALLOWED' in contract)
check('can_request_revision_excludes_self_service', "'canRequestRevision'=>$isOwner&&$c->creation_mode!=='self_service'" in contract)
check('expired_self_window_blocked', 'EDIT_WINDOW_EXPIRED' in contract and 'انتهت مهلة التعديل' in contract)
check('core_identity_locked_after_payment', "core_identity_locked=TRUE" in payment and 'CORE_IDENTITY_LOCKED' in contract)
check('options_locked_after_payment', 'CONTRACT_OPTIONS_LOCKED' in contract)

# Payment integrity
check('receipt_requires_exact_contract_amount', 'PAYMENT_AMOUNT_MISMATCH' in payment and '$expected=(float)$c->original_price_egp' in payment)
check('receipt_revalidates_draft', '$this->engine->validateDraft' in payment and 'DRAFT_INCOMPLETE' in payment)
check('receipt_contract_owner_query', '(c.user_id=? OR c.client_user_id=?)' in payment)
check('duplicate_pending_payment_blocked', 'DUPLICATE_PAYMENT' in payment)
check('payment_approval_starts_edit_window', "edit_window_started_at=CURRENT_TIMESTAMP" in payment and "edit_expires_at=CURRENT_TIMESTAMP" in payment)
check('customer_output_requires_payment', 'PAYMENT_REQUIRED_FOR_OUTPUT' in contract)
check('share_requires_payment', "assertCustomerOutputUnlocked($c,'المشاركة')" in contract)
check('pdf_download_requires_payment', "assertCustomerOutputUnlocked($c,'التنزيل')" in contract)
check('document_download_requires_payment', contract.count("assertCustomerOutputUnlocked($c,'التنزيل')") >= 2)

# Lawyer-assisted deposit/balance and final-file security
check('lawyer_total_snapshot_in_request', "'lawyerTotalPriceEgp'=>$lawyerTotalPriceEgp" in service)
check('lawyer_deposit_snapshot_in_request', "'lawyerDepositEgp'" in service)
check('lawyer_remaining_snapshot_in_request', "'lawyerRemainingEgp'" in service)
check('final_lawyer_deliverable_sets_balance_stage', "paymentStage" in service and "'balance'" in service and 'paymentDue' in service)
check('final_lawyer_deliverable_hidden_in_response_before_balance', 'array_filter($deliverables' in service and 'outstandingEgp>0.009' in service)
check('final_lawyer_attachment_direct_download_guard', 'clientServiceRequestAttachmentUnlocked' in attach)
check('final_lawyer_attachment_checks_is_final', "select('is_final')" in attach and 'is_final' in attach)
check('final_lawyer_attachment_checks_total_vs_approved', 'lawyerTotalPriceEgp' in attach and "status='approved'" in attach)
check('attachment_guard_used_for_download_show_thumbnail', attach.count('$this->authorizeFile($request,$file)') >= 3)

# PDF snapshot/rendering
check('lock_revalidates_draft', 'private function lockSnapshot' in contract and 'validateDraft' in contract)
check('lock_rejects_missing_legal_clauses', 'MISSING_LEGAL_CLAUSES' in contract)
check('lock_rejects_missing_variables', 'MISSING_LEGAL_VARIABLES' in contract)
check('document_hash_sha256', "hash('sha256',$this->stableJson($snapshot))" in contract)
check('pdf_job_queued_after_issue', "'generate_pdf','pending'" in contract)
check('manual_annex_uses_blank_sections', '$manualAnnex?$this->buildBlankSections($steps)' in worker)
check('manual_annex_never_fills_user_fields', 'buildBlankSections' in worker and 'manualFill' in worker)
check('required_annexes_forced_in_worker', "$variant['requiredAnnexKeys']" in worker and 'array_unique(array_merge' in worker)
check('php_engine_skips_manual_annex_validation', 'manualFillAnnex are printed as blank templates' in engine)

# Template inventory: 9 variants and blank annex rules
rent=data('backend/database/template-definitions/rental.json')
sale=data('backend/database/template-definitions/apartment_sale.json')
free=data('backend/database/template-definitions/freelancer.json')
check('rental_has_three_variants', len(rent.get('variants',[]))==3)
check('sale_has_three_variants', len(sale.get('variants',[]))==3)
check('freelancer_has_three_variants', len(free.get('variants',[]))==3)
check('nine_variants_total', sum(len(x.get('variants',[])) for x in (rent,sale,free))==9)

def annex(defn,key):
    return next((a for a in defn.get('optionalClauses',[]) if a.get('key')==key),None)
sa=annex(sale,'sale_installment_schedule')
ra=annex(rent,'rental_handover_inventory_report')
check('sale_installment_annex_blank_manual', bool(sa and sa.get('manualFillAnnex') is True and sa.get('outputMode')=='separate_annex'))
check('rental_handover_annex_blank_manual', bool(ra and ra.get('manualFillAnnex') is True and ra.get('outputMode')=='separate_annex'))
website=next(v for v in free['variants'] if v['key']=='website_development')
check('website_four_required_annexes', len(website.get('requiredAnnexKeys',[]))==4)
check('all_freelancer_annexes_manual_blank', all(a.get('manualFillAnnex') is True for a in free.get('optionalClauses',[])))
social=next(v for v in free['variants'] if v['key']=='social_media_management')
check('social_annexes_disabled_without_sources', social.get('allowedOptionalClauseKeys',[])==[])

# API/RBAC boundaries
check('admin_contract_group_auth', "Route::prefix('admin')->middleware('auth.session')" in routes)
check('admin_contract_edit_permission', "permission:contracts.edit_legal" in routes)
check('admin_contract_issue_permission', "permission:contracts.issue" in routes)
check('admin_payment_review_permission', "permission:payments.review" in routes)
check('admin_price_permission', 'pricing.manage' in routes)

# Pricing service must use variant keys; parent category fallback must not be runtime source.
check('pricing_service_variant_self_key', 'pricing.contracts.self_service.' in pricing)
check('pricing_service_variant_lawyer_key', 'pricing.contracts.lawyer_assisted.' in pricing)
check('pricing_service_no_parent_price_fallback', 'priceEgp' not in pricing)

failed=[k for k,ok,_ in checks if not ok]
print(f'\nPRODUCTION QA STATIC CHECKS {len(checks)-len(failed)}/{len(checks)}')
if failed:
    print('FAILED:', ', '.join(failed))
    sys.exit(1)
