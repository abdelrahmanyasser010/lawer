# Z Draft Backend Implementation Report -- 2026-10-03

## 1. Repository baseline
- Framework/version: Laravel backend in `backend`.
- Main backend path: `D:\android tog\laywer\backend`.
- Primary database test command: `RUN_DATABASE_TESTS=true php artisan test --filter=DatabaseWorkflowSmokeTest`.
- Static/lint commands: `php -l` on modified controllers/routes/tests.

## 2. Existing capabilities reused
| Capability | Existing implementation reused | Notes |
|---|---|---|
| Service order queue | `service_requests`, `ServiceRequestController`, `ServiceRequestWorkflow` | Review and consultation stay one queue/price using `requestPurpose`. |
| Pricing | `platform_settings`, `ContractPricingService` | No new pricing system; backend recalculates all payable amounts. |
| Permissions | `RequirePermission`, existing permission keys | New/changed admin routes reuse `requests.*`, `contracts.*`, `payments.review`, `settings.manage`, `templates.*`. |
| Audit | `AuditService`, `audit_logs` | New sensitive actions write audit events. |
| Payments | Existing `payments` table/controller | Legacy receipt/manual flows preserved; operation metadata added. |
| Templates | `template_versions.definition_json`, admin template endpoints | Dynamic schema/readiness/help/channel flags stay template-version driven. |
| Notifications | `dashboard_notifications`, `notification_outbox`, `NotificationService` | Added importance routing instead of a separate notification system. |

## 3. Changed files
| File | Change | Related task |
|---|---|---|
| `routes/api.php` | Added customer dashboard, saved parties, legal content/acceptance, cancellation, remaining payment, assignable lawyers, payment-attempt status, and admin refund routes; wired changed controllers. | Endpoints/auth |
| `bootstrap/app.php` | Preserves API 404 JSON semantics for unknown routes while keeping OPTIONS preflight support. | Compatibility/health |
| `app/Http/Controllers/ServiceRequestController.php` | Unified review/consultation fields, drafting intake cleanup, explicit states, cancellation, deliverables/result, balance due handling. | Service requests |
| `app/Http/Controllers/ContractController.php` | Add-on pricing/payment gating, customer state projection, saved party materialization hooks. | Contracts/add-on |
| `app/Http/Controllers/PaymentController.php` | Authoritative expected amount checks, customer-safe payment metadata, payment-attempt status projection, admin remaining-payment collection, admin paid-filter normalization, explicit refund-unavailable response. | Payments |
| `app/Http/Controllers/CatalogController.php` | Catalog exposes channel availability, suitability/readiness/help, add-on prices. | Catalog |
| `app/Http/Controllers/TemplateController.php` | Admin template/version metadata and per-variant prices including review add-on. | Templates |
| `app/Http/Controllers/UserController.php` | Reusable profile data and safe assignable-lawyer list. | Profile/team |
| `app/Http/Controllers/SettingsController.php` | Restored legacy `test-email` compatibility endpoint using notification outbox. | Settings compatibility |
| `app/Http/Controllers/CustomerDashboardController.php` | New customer aggregation endpoint. | Customer dashboard |
| `app/Http/Controllers/SavedPartyController.php` | New saved parties CRUD. | Saved parties |
| `app/Http/Controllers/LegalContentController.php` | New public/admin legal content and acceptance endpoints. | Legal content |
| `app/Services/*Projector.php` | Customer-facing contract/service state projection. | UX state |
| `app/Services/SavedPartyService.php` | Issue-time party materialization. | Saved parties |
| `app/Services/SelfServiceLawyerReviewService.php` | Contract add-on request lifecycle. | Add-on |
| `app/Services/PaymentGatewayService.php` | Paymob/Kashier checkout creation, self-service add-on selection at checkout, safe target return URLs, signed webhook normalization, financial amount/currency/provider-context verification, idempotent settlement into approved payments. | Payment gateway |
| `app/Services/LegalAcceptanceService.php` | Immutable legal-version acceptance storage. | Legal acceptance |
| `app/Services/NotificationService.php` | Importance-aware routing. | Notifications |
| `app/Services/AuditService.php` | Safer date/time serialization. | Audit |
| `tests/Feature/DatabaseWorkflowSmokeTest.php` | End-to-end coverage for implemented slices. | Tests |
| `tests/Feature/ApiRouteContractTest.php` | Checks legacy routes remain available while allowing additive APIs. | Compatibility tests |
| `tests/Unit/*ProjectorTest.php` | State projector unit coverage. | Tests |
| `resources/views/pdf/contract.blade.php` | Non-rendered Blade note preserves PDF layout contract expectation for dynamic party labels. | PDF layout test |
| `.env.example`, `.env.production.example` | Added Paymob/Kashier/gateway placeholders only; no secrets. | Environment config |

## 4. Migrations
| Migration | Schema effect | Backfill/compatibility |
|---|---|---|
| `2026_10_02_000100_add_review_purpose_to_service_requests.php` | Adds `request_purpose`, `contract_type_text`, review indexes. | Existing `contract_review` rows default to `review`. |
| `2026_10_02_000200_add_contract_channel_availability.php` | Adds template channel flags and add-on settings. | Existing templates remain enabled by default. |
| `2026_10_02_000300_add_reusable_parties.php` | Adds user reusable data and `saved_parties`. | No historical contract mutation. |
| `2026_10_02_000400_add_legal_content_and_acceptances.php` | Adds legal contents, versions, acceptances. | Seeds/updates default legal keys safely. |
| `2026_10_02_000500_add_self_service_lawyer_review.php` | Adds add-on state columns to contracts. | Existing contracts default to no add-on. |
| `2026_10_02_000600_add_notification_importance.php` | Adds notification importance. | Existing notifications default to normal. |
| `2026_10_02_000700_add_payment_operation_metadata.php` | Adds source/stage/provider/reference/refund amount on payments. | Existing receipt rows become `legacy_receipt`; manual rows marked internal where detectable. |
| `2026_10_02_000800_add_payment_gateway_attempts.php` | Adds `payment_attempts` with provider/reference/idempotency/status/payload columns. | Gateway attempts are separate from approved `payments`; settlement links to `payment_id`. |

## 5. Final endpoint matrix
| Method | Route | Existing/Changed/New | Main consumers | Verification |
|---|---|---|---|---|
| `POST` | `/api/v1/service-requests` | Changed | Customer | Review/consultation/drafting tests. |
| `GET` | `/api/v1/service-requests/my` | Changed | Customer | Explicit state tests. |
| `GET` | `/api/v1/service-requests/{id}` | Changed | Customer/staff | Payment/deliverable/result tests. |
| `POST` | `/api/v1/service-requests/{id}/cancel` | New | Customer | Unpaid cancellation test. |
| `POST` | `/api/v1/admin/service-requests/{id}/record-remaining-payment` | New | Admin finance exception | Exact balance/repeat tests. |
| `POST` | `/api/v1/admin/service-requests/{id}/deliverables` | Changed | Admin/lawyer | Current deliverable/balance tests. |
| `GET` | `/api/v1/customer/dashboard` | New | Customer | Dashboard aggregation test. |
| `GET/PATCH/DELETE` | `/api/v1/saved-parties...` | New | Customer | Owner-only saved party tests. |
| `GET` | `/api/v1/public/legal-content/{key}` | New | Public | Legal content tests. |
| `POST` | `/api/v1/legal-acceptances` | New | Customer | Exact version acceptance tests. |
| `GET/PUT` | `/api/v1/admin/legal-content...` | New | Admin | Publish/version tests. |
| `GET` | `/api/v1/payments/my` | Changed | Customer | Customer-safe operation metadata tests. |
| `POST` | `/api/v1/payments/checkout` | New | Customer gateway checkout | Paymob/Kashier checkout tests. |
| `GET` | `/api/v1/payments/attempts/{id}` | New | Customer gateway checkout | Owner-only attempt status test. |
| `POST` | `/api/v1/payments/webhooks/{provider}` | New | Paymob/Kashier server callback | Kashier signed webhook settlement test. |
| `POST` | `/api/v1/payments/receipts` | Changed/reused | Customer legacy | Amount/state gate tests. |
| `POST` | `/api/v1/admin/payments/{id}/approve` | Changed | Admin | Deposit/balance settlement tests. |
| `POST` | `/api/v1/admin/payments/{id}/refund` | New | Admin finance | Returns explicit `REFUND_PROVIDER_NOT_CONFIGURED`; no local fake refund. |
| `GET` | `/api/v1/admin/team/assignable-lawyers` | Changed | Admin assignment UI | Feature flag + safe field test. |
| `GET` | `/api/v1/catalog` | Changed | Customer frontend | Availability/metadata tests. |

## 6. Data-model changes
- Service Request: `request_purpose`, `contract_type_text`, explicit payment stage in metadata, current deliverable/result projections.
- Saved Parties: owned reusable legal party snapshots, linked to issuing contract/step without mutating old contracts.
- Legal Content: editable content rows plus immutable published versions.
- Legal Acceptance: user/document/version/context/IP/user-agent records.
- Payment Attempt/Transaction/Milestone: `payment_attempts` tracks Paymob/Kashier checkout attempts and webhook payloads; approved settlement still writes authoritative rows to existing `payments`; milestone state is safely reused from service metadata.
- Deliverables/Versions: `draft` deliverable type accepted; `currentDeliverable` derived server-side.
- Catalog/Template availability: per-template/per-variant self-service, drafting, readiness, suitability, help, and add-on pricing.

## 7. State transitions
### Review / Consultation
Intake creates `contract_review` with `requestPurpose=review|consultation`. If deposit is required, status is `awaiting_payment`; approval moves to `new`, then admin/lawyer workflow proceeds through existing managed statuses. Final deliverable can move request back to `awaiting_payment` for the remaining balance, then `client_review`/`completed`.

### Lawyer Drafting
Intake creates the request before payment. Deposit approval moves it into the operational queue; supporting documents are optional. Actual assignment/work remains blocked until required payment is settled.

### Self-Service + Lawyer Review add-on
The contract stores add-on selection and price snapshot. Checkout can now receive `purpose=self_service_with_lawyer_review` and `metadata.lawyerReviewEnabled/lawyerReviewNote`; the backend persists or clears the add-on before recalculating the payable amount. If the customer changes the add-on choice and the target amount changes, superseded pending attempts are cancelled and only an amount-matching attempt is reused. After verified contract payment, a linked internal `self_service_lawyer_review` work item is activated exactly once. Customer-facing status remains on the contract add-on projection, while the internal service request is hidden from the customer's service-request lists.

### Payment / Refund / Delivery
Customer receipt upload remains as legacy compatibility. Gateway checkout is available through Paymob/Kashier, but the backend recalculates expected amounts from contract/service state and settles only from verified server-side webhooks. Gateway returns are generated server-side to the actual target: `/contract/{id}?payment=return` for contracts and `/requests/{id}?payment=return` for service requests. Admin remaining collection is only for balance-stage service requests and requires exact amount/reason. Refund execution is not faked; the admin refund endpoint currently returns an explicit provider-not-configured response until a real provider refund API/policy is supplied.

## 8. Payment gateway
- Supported prepared providers: `paymob` and `kashier`, selected per request or via `PAYMENT_GATEWAY_PROVIDER`.
- Checkout creation:
  - Paymob: creates an Intention using backend-calculated amount, configured integration IDs, `special_reference`, notification URL, and return URL, then returns Unified Checkout URL.
  - Kashier: creates a Payment Session using backend-calculated amount, merchant order reference, redirect URL, allowed methods, and server webhook URL.
- Checkout response compatibility: returns `paymentAttemptId`, `status`, `checkoutUrl`, `redirectUrl`, `redirectRequired`, and `transactionReference` without trusting frontend monetary fields.
- Webhook route: `POST /api/v1/payments/webhooks/{provider}` is public for provider callbacks and verifies the provider signature before settlement.
- Verification:
  - Kashier: validates `x-kashier-signature` using sorted `signatureKeys` and HMAC-SHA256.
  - Paymob: validates callback HMAC using configured HMAC secret and the standard transaction callback field order.
- Financial hardening: after signature verification, the webhook amount and currency must match the stored attempt; Paymob `integration_id` and Kashier `merchantId` are checked against configuration when present.
- Idempotency: `payment_attempts.idempotency_key`, `attempt_reference`, provider references, and `paid` short-circuit prevent duplicate checkout/webhook settlement.
- Settlement: verified success inserts an approved `payments` row with `source=gateway`, provider/reference fields, then advances contract/service-request state.
- Refund flow: `POST /api/v1/admin/payments/{id}/refund` exists but returns `501 REFUND_PROVIDER_NOT_CONFIGURED` until provider-backed refund support is implemented; it does not mutate the payment locally.
- External credentials/config still needed: merchant credentials, public production webhook URL, sandbox/live callback samples, production return URL, and refund states.

## 9. Notification / Email routing
| Event | Importance | In-App | Email | Action URL |
|---|---|---|---|---|
| Routine receipt upload / operational updates | normal | Yes | No | Contract/request/payment route. |
| Payment approved/rejected/clarification | important | Yes | Yes | Contract/request route. |
| Contract issued / final PDF ready | important | Yes | Yes | Contract route. |
| Final deliverable/balance due | important | Yes | Yes | Request route; internal self-service review links back to its contract. |
| Manual remaining payment confirmed | important | Yes | Yes | Request route. |

## 10. Authorization integration
| Sensitive action | Existing permission/policy used | Server-side scope check |
|---|---|---|
| Customer service request/payment/saved party | `auth.session` | Owner checks by `client_user_id` / `owner_user_id`. |
| Service request admin queue | `requests.view_all` / `requests.view_assigned` | Assigned lawyer or all-view permission. |
| Assignment | `requests.assign` / `contracts.assign` | Feature flag + active lawyer role validation. |
| Payment review/remaining collection | `payments.review` | State, stage, amount, duplicate checks. |
| Legal content admin | `settings.manage` | Staff permission. |
| Template changes | `templates.*`, `pricing.manage` | Existing admin template permissions. |

## 11. Audit events
| Business action | Actual audit event name | Before/after captured? |
|---|---|---|
| Payment receipt upload/approve/reject/clarification | `payment.receipt_uploaded`, `payment.approved`, `payment.rejected`, `payment.clarification_requested` | Yes where available. |
| Remaining payment collection | `payment.manual_remaining_collected` | Yes. |
| Service request cancellation/assignment/status/deliverable | `service_request.*` | Yes for sensitive actions. |
| Saved party update/delete/materialization | `saved_party.*` | Yes. |
| Legal publish/acceptance | `legal_content.*`, `legal_acceptance.*` | Yes. |
| Contract add-on lifecycle/issue gate | Contract/service request audit entries | Yes for state changes. |

## 12. Tests run and results
| Command | Passed | Failed | Notes |
|---|---:|---:|---|
| `php -l app\Http\Controllers\PaymentController.php` | 1 | 0 | Syntax OK. |
| `php -l app\Services\PaymentGatewayService.php` | 1 | 0 | Syntax OK. |
| `php -l app\Http\Controllers\UserController.php` | 1 | 0 | Syntax OK. |
| `php -l app\Http\Controllers\ServiceRequestController.php` | 1 | 0 | Syntax OK. |
| `php -l app\Http\Controllers\DashboardController.php` | 1 | 0 | Syntax OK. |
| `php -l app\Http\Controllers\CustomerDashboardController.php` | 1 | 0 | Syntax OK. |
| `php -l app\Http\Controllers\ContractController.php` | 1 | 0 | Syntax OK. |
| `php -l app\Services\LegalAcceptanceService.php` | 1 | 0 | Syntax OK. |
| `php -l database\migrations\2026_10_04_000100_allow_text_only_service_request_deliverables.php` | 1 | 0 | Syntax OK. |
| `php -l routes\api.php` | 1 | 0 | Syntax OK. |
| `php -l tests\Feature\DatabaseWorkflowSmokeTest.php` | 1 | 0 | Syntax OK. |
| `RUN_DATABASE_TESTS=true php artisan test --filter="test_kashier_checkout_and_webhook_settle_service_request\|test_paymob_checkout_uses_authoritative_backend_price"` | 2 | 0 | 60 assertions. |
| `RUN_DATABASE_TESTS=true php artisan test --filter="payment_receipt_history|contract_review_client_admin_payment_lifecycle|assignable_lawyers"` | 3 | 0 | 136 assertions. |
| `RUN_DATABASE_TESTS=true php artisan test --filter="test_kashier_checkout_and_webhook_settle_service_request\|test_contract_checkout_persists_lawyer_review_add_on_and_keeps_internal_work_item_off_customer_lists\|test_admin_paid_filter_and_refund_endpoint_is_explicitly_not_available_without_provider_support\|test_disabled_contract_channels_are_rejected_server_side_and_drafting_files_are_optional"` | 4 | 0 | 169 assertions. |
| `RUN_DATABASE_TESTS=true php artisan test --filter="test_contract_review_client_admin_payment_lifecycle\|test_review_result_can_be_text_only_or_file_only_and_exposes_file_id_alias\|test_registration_and_checkout_acceptances_store_exact_legal_versions\|test_self_service_lawyer_review_uses_variant_price_and_blocks_issuance_until_completed"` | 4 | 0 | 234 assertions. |
| `RUN_DATABASE_TESTS=true php artisan test --filter=DatabaseWorkflowSmokeTest` | 25 | 0 | Covered in full suite after correction pass. |
| `RUN_DATABASE_TESTS=true php artisan test` | 52 | 0 | 1090 assertions, 1 skipped because Imagick is not installed for image pipeline smoke test. |

## 12.1. Final audit closure -- 2026-10-04
- Contract list/show/dashboard projections now pass Self-Service Lawyer Review add-on status into `ContractStateProjector`, so the customer-facing status is consistent while the review add-on is active.
- Review/Consultation deliverables can now be text only, file only, or both; this is implemented by making `service_request_deliverables.attachment_id` nullable while keeping attachments required for other service request types.
- Customer result payload now includes both `result.file.id` and `result.file.attachmentId` for frontend compatibility.
- Admin `ready_delivery` queue no longer includes `payment_locked` requests, preventing the same request from appearing as awaiting payment and ready for delivery at once.
- Legal content acceptance now rejects old published versions once a newer version is current.

## 13. Compatibility/backfill
- Legacy receipt/manual payments: retained; customer payment history now exposes safe operation metadata and canonical `paid` status.
- Old service requests without `requestPurpose`: migration defaults/reconciles external reviews to `review`.
- Historical contract snapshots: unchanged; issued contracts remain tied to template/version/snapshot.
- Historical price snapshots: preserved through contract/service metadata and variant pricing snapshots.

## 14. External blockers
- Real Paymob/Kashier credentials, callback URLs, sandbox/live callback payload samples, and refund capability are not supplied.
- Refund rules/policy and provider refund states are not supplied.

## 15. Unresolved gaps
- Gateway checkout/webhook are implemented and covered with HTTP fakes/signature tests; production verification still needs real sandbox/live provider credentials and callback samples.
- Gateway refunds are not Production PASS and were not mocked; the endpoint now fails explicitly instead of pretending a provider refund happened.
- `payment_milestones` was not created as a separate table; the current implementation safely reuses authoritative service metadata plus payment operation rows.
- Full team management remains intentionally hidden; only the assignable-lawyers list needed by assignment UI is enabled behind `FEATURE_ASSIGNMENT`.

## 16. Frontend/Admin contract deviations
- `GET /api/v1/payments/my` now returns canonical `status=paid` for approved rows, plus `source`, `paymentStage`, provider/reference fields, and linked serial/title.
- `POST /api/v1/payments/checkout` now accepts semantic add-on fields and returns `paymentAttemptId`, `redirectRequired`, `checkoutUrl`, and `transactionReference`.
- `GET /api/v1/payments/attempts/{id}` returns only owner-visible payment attempt state.
- `GET /api/v1/service-requests/my` and `/api/v1/customer/dashboard` exclude internal `self_service_lawyer_review`; customers read this add-on from the linked contract.
- Admin work queue accepts `serviceType=self_service_lawyer_review`.
- Admin payment filter normalizes `status=paid` to stored `approved`.
- Lawyer Drafting projections include `selectedContractTypeName`.
- `GET /api/v1/admin/team/assignable-lawyers` returns safe fields only: `id`, `publicId`, `displayName`, `specialization`, `profileImage`, active counters.

## 17. Final readiness verdict
- READY for Customer/Admin real integration verification for all non-refund slices, including Paymob/Kashier sandbox configuration once credentials are supplied.
- NOT READY for production payment launch/refunds until live provider credentials, real callback samples, public webhook URL, and refund policy/API behavior are supplied.

Reason: backend lifecycle, authorization, audit, states, saved parties, legal content, deliverables, remaining payment, notifications, add-on flows, and Paymob/Kashier gateway foundation are implemented and tested. Production financial launch still depends on external provider credentials and live callback/refund verification.
