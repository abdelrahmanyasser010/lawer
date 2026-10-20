# Paymob readiness handoff -- 2026-10-12

## Status

Paymob is prepared as the active payment gateway in the backend environment examples. No real merchant secrets are committed.

The current backend uses Paymob Intention API and waits for the real credentials before live/sandbox verification.

## Current backend flow

1. Customer starts checkout through `POST /api/v1/payments/checkout`.
2. Backend calculates the payable amount server-side.
3. Backend creates a Paymob intention through `POST https://accept.paymob.com/v1/intention/`.
4. Paymob returns `client_secret`, `id`, and `intention_order_id`.
5. Backend returns:
   - `paymentAttemptId`
   - `redirectRequired`
   - `redirectUrl`
   - `checkoutUrl`
6. Paymob sends the final transaction callback to:
   - `https://<api-domain>/api/v1/payments/webhooks/paymob`
7. Backend validates HMAC, amount, currency, and integration ID before settlement.

## Credentials still needed from Paymob

Add these values only in the deployed `.env` or hosting secret manager:

```env
PAYMENT_GATEWAY_PROVIDER=paymob
PAYMENT_GATEWAY_CURRENCY=EGP
PAYMENT_GATEWAY_WEBHOOK_URL=https://<api-domain>/api/v1/payments/webhooks/{provider}

PAYMOB_BASE_URL=https://accept.paymob.com
PAYMOB_API_KEY=
PAYMOB_SECRET_KEY=
PAYMOB_PUBLIC_KEY=
PAYMOB_HMAC_SECRET=
PAYMOB_INTEGRATION_IDS=
PAYMOB_INTENTION_EXPIRATION_SECONDS=3600
```

Notes:

- `PAYMOB_INTEGRATION_IDS` accepts one or more IDs separated by commas, for example `123456,789012`.
- Test credentials and live credentials must not be mixed. The Secret/Public keys and Integration IDs must all belong to the same Paymob mode.
- Do not put real Paymob keys in Git.

## Paymob dashboard callback setup

For each enabled Payment Integration ID in Paymob dashboard:

- Webhook / Transaction Processed Callback:
  - `https://<api-domain>/api/v1/payments/webhooks/paymob`
- Redirect / Transaction Response Callback:
  - Use the frontend domain. The backend also sends a target-aware `redirection_url` per checkout:
    - Contracts: `${FRONTEND_URL}/contract/{id}?payment=return`
    - Service requests: `${FRONTEND_URL}/requests/{id}?payment=return`

The server-side webhook is the source of truth for marking payments as paid. The redirect is only for user experience after payment.

## Verification checklist after keys arrive

- Put sandbox keys in `.env`.
- Clear Laravel config cache if used: `php artisan config:clear`.
- Create a test checkout from the customer frontend.
- Confirm Paymob redirect opens.
- Complete a sandbox payment.
- Confirm webhook reaches `/api/v1/payments/webhooks/paymob`.
- Confirm payment attempt is settled only after:
  - HMAC is valid.
  - Provider amount equals backend attempt amount.
  - Provider currency equals backend attempt currency.
  - Provider integration ID is allowed in `PAYMOB_INTEGRATION_IDS`.
- Confirm contract/service state updates in customer frontend and admin dashboard.

## Not production-ready until

- Paymob sandbox credentials are tested.
- Public webhook URL is reachable from Paymob.
- Live credentials are added through deployment secrets.
- Refund provider API/policy is confirmed. Current refund endpoint intentionally does not fake refunds.
