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

Cloud Run also exposes the service at `https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app`. Backend CORS must allow both frontend origins.

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

Local service ports expected by the frontend defaults:
- Auth/Profile: `http://localhost:8081`
- Inventory: `http://localhost:8082`
- Wallet: `http://localhost:8083`
- Order: `http://localhost:8084`
- Voucher/Promo: `http://localhost:8085`

For a local demo stack, run Voucher/Promo with `SPRING_PROFILES_ACTIVE=cloudrun` so `MILESTONE10` is seeded automatically.

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

## Product Images

Inventory does not currently expose product image URLs. The frontend therefore renders:
- real remote images when a valid `imageUrl` exists
- generated fallback artwork when `imageUrl` is missing or fails to load

This prevents broken image icons in the catalog and product detail pages while still using the real Inventory payload.

## Selenium Demo Script

For a slow, visible walkthrough of the live deployed app:

```bash
python -m pip install --user -r requirements-selenium.txt
python scripts/selenium_demo_flow.py --slow-seconds 6 --result-extra-seconds 10
```

The script opens a real browser and walks through:
- register
- login
- browse products
- wallet top-up
- checkout with `MILESTONE10`
- order result
- optional insufficient-balance failure flow

Useful flags:
- `--browser edge`
- `--browser chrome`
- `--no-show-failure-flow`
- `--no-hold-open`

## Standalone Verifier

A stricter evidence-producing verifier lives in [verification/selenium-verifier](./verification/selenium-verifier).

It uses:
- Selenium for the real frontend flow
- direct API assertions for before/after state
- a separate concurrency runner for Inventory, Wallet, and Voucher

Quick start:

```bash
cd verification/selenium-verifier
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
pytest tests/test_live_verification.py -m live -s --html=verification-artifacts\live-report.html --self-contained-html
python scripts/run_concurrency.py
```

The verifier writes screenshots, raw API evidence, and run summaries under `verification-artifacts/`.

A curated committed evidence snapshot from a live deployed run is available under [verification/selenium-verifier/evidence/live-20260415](./verification/selenium-verifier/evidence/live-20260415).

## Cloud Run Deploy

```bash
gcloud run deploy advprog-frontend-m25-m50 --source . --region us-central1 --allow-unauthenticated --max-instances=1
```

Health check path:
- `GET /status`

## Manual QA Checklist

- Open `/` and confirm service health cards load.
- Open `/status` and confirm the frontend returns `ok`.
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
