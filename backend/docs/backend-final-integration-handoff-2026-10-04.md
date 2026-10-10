# Z Draft Backend Final Integration Handoff -- 2026-10-04

## Current verdict

Backend integration state is **ready for Customer/Admin real integration verification** for all non-refund slices.

Payment gateway work is **ready for Paymob/Kashier sandbox wiring**, but it is not a production financial launch until real credentials, public webhook URL, provider callback samples, and refund behavior are verified.

## Closed in the final correction pass

1. **Self-Service Lawyer Review status projection**
   - Contract list, contract show, and customer dashboard now pass the lawyer review add-on state into `ContractStateProjector`.
   - The customer should see the same state across dashboard and contract details while the contract is under lawyer review.

2. **Review/Consultation deliverables**
   - A review/consultation result may be text only, file only, or text + file.
   - `service_request_deliverables.attachment_id` is nullable.
   - Other professional service types still require an attachment.

3. **Frontend file payload compatibility**
   - `result.file.id` is returned for the customer frontend.
   - `result.file.attachmentId` is also preserved.

4. **Admin work queue buckets**
   - `ready_delivery` no longer includes `payment_locked`.
   - Requests waiting for remaining payment should stay in the payment bucket only.

5. **Legal content version acceptance**
   - Old legal content versions are rejected after a newer version becomes current.
   - Checkout/registration must submit the latest published version.

## Key endpoints to verify from Customer/Admin

### Customer

- `GET /api/v1/contracts/my`
- `GET /api/v1/contracts/{id}`
- `GET /api/v1/customer/dashboard`
- `POST /api/v1/payments/checkout`
- `GET /api/v1/payments/attempts/{id}`
- `GET /api/v1/service-requests/my`
- `GET /api/v1/service-requests/{id}`

### Admin

- `GET /api/v1/admin/dashboard/work-queue`
- `POST /api/v1/admin/service-requests/{id}/deliverables`
- `POST /api/v1/admin/payments/{id}/refund`
- `GET /api/v1/admin/payments`
- `GET /api/v1/admin/team/assignable-lawyers`

## Expected integration behavior

- Self-Service Lawyer Review service request remains hidden from the customer's general service request lists.
- The customer reads Self-Service Lawyer Review state from the linked contract add-on object.
- Admin can still see the internal Self-Service Lawyer Review work item in the operational queue.
- Checkout returns `paymentAttemptId`, `redirectRequired`, `redirectUrl`, `checkoutUrl`, and `transactionReference`.
- Backend recalculates all payable amounts and ignores any frontend amount as pricing authority.
- Provider success callbacks are rejected if amount/currency/provider identifiers do not match the stored attempt.
- Refund endpoint exists but returns `501 REFUND_PROVIDER_NOT_CONFIGURED` until real provider-backed refunds are implemented.

## Verification already run

| Check | Result |
|---|---|
| PHP syntax checks for changed backend files | PASS |
| Final targeted tests | PASS: 4 tests, 234 assertions |
| Full backend suite | PASS: 52 tests, 1090 assertions |
| Image pipeline test | SKIPPED: Imagick missing locally |

## Remaining external blockers before production payment/refund launch

- Real Paymob credentials.
- Real Kashier credentials.
- Public HTTPS webhook URL.
- Sandbox callback samples from Paymob and Kashier.
- Live callback samples before production.
- Provider-backed refund API behavior and refund state mapping.
- Production email provider configuration.

## What not to change in the next pass

- Do not build a new pricing system.
- Do not build a new permission system.
- Do not expose internal `self_service_lawyer_review` as a normal customer service.
- Do not fake refunds locally.
- Do not trust frontend amount fields.
- Do not create duplicate endpoints when an equivalent endpoint already exists.
