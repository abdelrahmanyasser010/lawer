# Z draft Dashboard

Standalone Next.js operations dashboard for the law office.

## Responsibilities

- Unified work queue for lawyer-assisted drafting, contract reviews and consultations.
- Office-created contracts without impersonating customers.
- Payment review, clients, assignments, versions and audit-facing metadata.
- Team and role management UI.
- Template/version visibility through the shared `@zdraft/template-engine` package.

## Local run

```bash
npm install
npm run dev
```

Default URL: `http://localhost:3001`.

Copy `.env.example` to `.env.local`. `NEXT_PUBLIC_DASHBOARD_DEMO_ROLE` is temporary UI scaffolding only. Real authentication and authorization must be enforced by the backend before production.

## Office contract creation

`/contracts/create` posts an `office_assisted` draft to the API with staff identity, client mode, lawyer assignment, and billing/waiver metadata. `NEXT_PUBLIC_DRAFT_SOURCE` controls whether API failure may temporarily fall back to local storage.

## Production boundary

The client-side permission gate prevents accidental route access in the UI, but it is not a security boundary. The backend must authenticate the staff session and verify the required permission on every endpoint.
