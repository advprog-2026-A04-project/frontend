# Frontend

React + Vite frontend for Milestone `25%` and `50%` only.

This app calls the real deployed microservices directly:
- Auth/Profile
- Inventory
- Wallet
- Order
- Voucher/Promo

It does not include Milestone `75%` or `100%` features.

## Deployed URL

- `https://advprog-frontend-m25-m50-383620816191.us-central1.run.app`

## Required Environment Variables

Development defaults live in [.env.example](./.env.example).

- `VITE_AUTH_BASE_URL`
- `VITE_INVENTORY_BASE_URL`
- `VITE_WALLET_BASE_URL`
- `VITE_ORDER_BASE_URL`
- `VITE_VOUCHER_BASE_URL`

Production build values live in [.env.production](./.env.production) and point to the deployed Cloud Run services.

## Local Run

Prerequisites:
- Node.js `20.19+` recommended

Commands:

```bash
npm ci
npm run dev
```

Development URL:
- `http://localhost:5173`

## Test and Build

```bash
npm run lint
npm run test
npm run build
```

The automated frontend suite covers:
- register flow
- login and authenticated session hydration
- product browsing
- checkout with voucher input
- successful order result flow

## Cloud Run Deploy

```bash
gcloud run deploy advprog-frontend-m25-m50 --source . --region us-central1 --allow-unauthenticated --max-instances=1
```

## Manual QA Checklist

- Open `/` and confirm service health cards load.
- Register a new buyer account.
- Log in with the new account.
- Open `/products` and browse the catalog.
- Open a product detail page.
- Open `/wallet`, top up balance, and confirm the balance changes.
- Open `/checkout`, enter `MILESTONE10`, and confirm the voucher field is present.
- Complete checkout and confirm the result page shows a paid order.
- Open `/orders` and confirm the order is listed.
- Retry checkout with insufficient balance and confirm the UI surfaces the failure.

## Limitations

- The frontend is intentionally scoped to Milestone `25%` and `50%`.
- Service-local storage is used for the demo stack, so data is not durable across Cloud Run instance restarts.
- Voucher validation preview is estimated from the public active-voucher list; final validation and quota claim happen inside the Order service.
