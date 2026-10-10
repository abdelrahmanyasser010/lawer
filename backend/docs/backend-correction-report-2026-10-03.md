# Z Draft Backend Correction Pass Report -- 2026-10-03

## Scope
This pass addressed only the integration gaps found after auditing the backend against the approved customer frontend, admin frontend, and API contract. No pricing system, permission system, chat workflow, document-request workflow, or revision system was rebuilt.

## Corrections completed

1. Self-Service Lawyer Review checkout is authoritative.
   - `POST /api/v1/payments/checkout` accepts semantic fields:
     - `purpose=self_service_with_lawyer_review`
     - `metadata.lawyerReviewEnabled`
     - `metadata.lawyerReviewNote`
   - The backend selects/clears the add-on before recalculating the payable amount.
   - Frontend `amountEgp` is ignored for pricing authority.
   - Add-on note is persisted on the contract.
   - If the add-on choice changes the payable amount, pending superseded attempts are cancelled and only a matching attempt is reused.
   - Successful settlement activates the linked internal `self_service_lawyer_review` work item exactly once.

2. Payment return URL is target-aware.
   - Contract checkout returns to `${FRONTEND_URL}/contract/{id}?payment=return`.
   - Service checkout returns to `${FRONTEND_URL}/requests/{id}?payment=return`.
   - Arbitrary frontend `returnUrl` is not trusted.

3. Checkout/status payload now matches the frontend contract.
   - Checkout payload includes:
     - `paymentAttemptId`
     - `status`
     - `checkoutUrl`
     - `redirectUrl`
     - `redirectRequired`
     - `transactionReference`
   - Added owner-safe `GET /api/v1/payments/attempts/{id}`.

4. Admin refund endpoint exists but does not fake refunds.
   - Added `POST /api/v1/admin/payments/{id}/refund`.
   - Current response is `501 REFUND_PROVIDER_NOT_CONFIGURED`.
   - Payment state is not mutated locally without provider-backed refund support.

5. Gateway env placeholders were added.
   - `.env.example`
   - `.env.production.example`
   - Paymob/Kashier placeholders only; no secrets.

6. Internal Self-Service Lawyer Review work item is hidden from customer service lists.
   - Excluded from `/api/v1/service-requests/my`.
   - Excluded from `/api/v1/customer/dashboard`.
   - Direct customer show returns `404 INTERNAL_SERVICE_REQUEST`.
   - Customer-facing add-on state remains on the linked contract under `lawyer_review_add_on`.
   - Admin work queue still supports `serviceType=self_service_lawyer_review`.

7. Admin integration mismatches fixed.
   - Admin work queue supports `serviceType=self_service_lawyer_review`.
   - Admin payment filter normalizes `paid` to stored `approved`.
   - Lawyer Drafting projections include `selectedContractTypeName`.

8. Webhook financial hardening added.
   - After provider signature verification, the backend checks:
     - provider-reported amount equals stored attempt amount
     - provider-reported currency equals stored attempt currency
     - Paymob `integration_id` matches configured integration IDs when present
     - Kashier `merchantId` matches configured merchant ID when present
   - Mismatched success callbacks are rejected before settlement.

## Final audit closure corrections -- 2026-10-04

This follow-up addressed only the remaining integration gaps from the final audit, without rebuilding the service/order/payment architecture.

1. Self-Service Lawyer Review state is wired into actual contract projections.
   - `ContractController::my` passes the add-on selection/status into `ContractStateProjector`.
   - `ContractController::show` passes the add-on selection/status into `ContractStateProjector`.
   - `CustomerDashboardController` now includes the add-on fields and projects the customer-facing status consistently.
   - Result: dashboard/list/show can all surface the same "contract is with the lawyer for review" state instead of a generic contract state.

2. Review/Consultation deliverables can be text only, file only, or both.
   - `service_request_deliverables.attachment_id` is nullable.
   - Admin deliverable publishing no longer requires an attachment for `contract_review` requests.
   - A text-only review/consultation result is valid.
   - A file-only review/consultation result is valid.
   - Other service request types still require an attachment.

3. Customer result file payload is frontend-compatible.
   - `result.file.id` is returned.
   - `result.file.attachmentId` is still returned as the existing backend alias.
   - Text-only results return `result.file = null`.

4. Work queue delivery/payment buckets are no longer overlapping.
   - `ready_delivery` now includes only genuinely deliverable requests.
   - `payment_locked` remains in payment-required queues and no longer appears as ready for delivery at the same time.

5. Legal content acceptance was tightened to latest published versions.
   - Accepting a non-existent legal content version still returns `LEGAL_CONTENT_VERSION_NOT_FOUND`.
   - Accepting an old version after a newer version is published now returns `LEGAL_CONTENT_VERSION_OUTDATED`.
   - Registration/checkout must submit the current published legal content version.

## Files changed in this correction pass

- `app/Http/Controllers/ContractController.php`
- `app/Services/PaymentGatewayService.php`
- `app/Http/Controllers/PaymentController.php`
- `app/Http/Controllers/ServiceRequestController.php`
- `app/Http/Controllers/DashboardController.php`
- `app/Http/Controllers/CustomerDashboardController.php`
- `app/Services/LegalAcceptanceService.php`
- `routes/api.php`
- `.env.example`
- `.env.production.example`
- `database/migrations/2026_10_04_000100_allow_text_only_service_request_deliverables.php`
- `tests/Feature/DatabaseWorkflowSmokeTest.php`
- `docs/backend-implementation-report-2026-10-03.md`

## Verification

| Command | Result |
|---|---|
| `php -l app\Services\PaymentGatewayService.php` | PASS |
| `php -l app\Http\Controllers\PaymentController.php` | PASS |
| `php -l app\Http\Controllers\ServiceRequestController.php` | PASS |
| `php -l app\Http\Controllers\DashboardController.php` | PASS |
| `php -l app\Http\Controllers\CustomerDashboardController.php` | PASS |
| `php -l app\Http\Controllers\ContractController.php` | PASS |
| `php -l app\Services\LegalAcceptanceService.php` | PASS |
| `php -l database\migrations\2026_10_04_000100_allow_text_only_service_request_deliverables.php` | PASS |
| `php -l routes\api.php` | PASS |
| `php -l tests\Feature\DatabaseWorkflowSmokeTest.php` | PASS |
| Targeted correction tests | PASS: 4 tests, 169 assertions |
| Final audit targeted tests | PASS: 4 tests, 234 assertions |
| Full suite: `RUN_DATABASE_TESTS=true php artisan test` | PASS: 52 tests, 1090 assertions, 1 skipped due missing Imagick |

## Remaining production blockers

- Real Paymob/Kashier credentials.
- Public webhook URL.
- Sandbox/live callback samples for both providers.
- Provider-backed refund API/policy and exact refund states.
- Production email provider status/config remains outside this correction pass.
