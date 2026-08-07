# Z draft Customer Frontend

Standalone Next.js customer application for browsing templates, building contracts, drafts, payments, consultations, and customer account flows.

The administration dashboard has been extracted into the sibling `dashboard/` project. This frontend no longer exposes `/admin` routes or imports dashboard components.

## Local development

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`. Copy `.env.example` to `.env.local` and configure `NEXT_PUBLIC_API_URL`.
