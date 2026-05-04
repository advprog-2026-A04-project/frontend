# Milestone 75 Deployment Verification

## Scope

This document records the Milestone `75%` deployment, deployed smoke verification, and Selenium evidence for:

- `services/frontend`
- `services/Order`
- `services/Auth-Profile`

The deployed buyer-facing UI now follows the newer attached frontend source:

- `remix_-json-limited-drops (1).zip`

The previous frontend implementation is retained only where it was already proven:

- centralized API integration in `src/lib/api.js`
- route and backend contracts
- admin and jastiper operational pages
- Selenium and deployment compatibility

## Target Platform

Google Cloud Run, region `us-central1`

## Deployed Services

Frontend:

- URL: `https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app`
- Revision: `advprog-frontend-m25-m50-00009-tkj`
- Commit deployed: `a2a07d9` (`Merge origin/main with current frontend`)

Auth/Profile:

- URL: `https://auth-profile-api-osvihgaoya-uc.a.run.app`
- Revision: `auth-profile-api-00007-8ht`
- Commit deployed: `0ea5a5b` (`Make demo seeding opt-in`)

Order:

- URL: `https://order-api-osvihgaoya-uc.a.run.app`
- Revision: `order-api-00005-bjr`
- Commit deployed: `4ad26bf` (`Update order deployment notes`)

Supporting services used by the deployed frontend:

- Inventory: `https://inventory-api-osvihgaoya-uc.a.run.app` (`inventory-api-00003-gs7`)
- Wallet: `https://wallet-api-osvihgaoya-uc.a.run.app` (`wallet-api-00003-77s`)
- Voucher: `https://voucher-promo-api-osvihgaoya-uc.a.run.app` (`voucher-promo-api-00006-2rp`)

Verification timestamp recorded locally:

- `2026-05-04T02:21:36+07:00`

## Deployment Commands Run

Auth/Profile:

```bash
gcloud run deploy auth-profile-api --source . --region us-central1 --allow-unauthenticated --update-env-vars APP_DEMO_SEED_ENABLED=true
```

Frontend:

```bash
gcloud run deploy advprog-frontend-m25-m50 --source . --region us-central1 --allow-unauthenticated
```

Order was not redeployed in this follow-up because frontend/API compatibility did not require a new Order revision.

## Frontend Environment Contract

The deployed frontend build no longer depends on a committed `.env.production`. It uses either explicit `VITE_*` overrides or the built-in deployed fallbacks in `src/lib/api.js`:

- `VITE_AUTH_BASE_URL`
- `VITE_INVENTORY_BASE_URL`
- `VITE_WALLET_BASE_URL`
- `VITE_ORDER_BASE_URL`
- `VITE_VOUCHER_BASE_URL`

The frontend build does not embed the voucher admin token. The admin UI requires manual token entry at runtime and masks the field to avoid exposing the token in screenshots.

## Auth Demo Account Safety

`APP_DEMO_SEED_ENABLED` now defaults to `false` in every profile, including `demo`.

For the public milestone demo deployment, Cloud Run is explicitly configured with:

```env
APP_DEMO_SEED_ENABLED=true
```

That keeps seeded buyer, jastiper, and admin accounts available for the shared demo while avoiding silent seeding in production-like environments by default. Legacy compatibility with `APP_DEMO_ACCOUNTS_ENABLED` is still supported, but new deployments should use `APP_DEMO_SEED_ENABLED`.

## Test and Build Commands

Frontend:

```bash
npm test
npm run build
npm run lint
npx -y -p node@20.19.0 -p npm@10 npm test
npx -y -p node@20.19.0 -p npm@10 npm run build
npx -y -p node@20.19.0 -p npm@10 npm run lint
```

Auth/Profile:

```bash
./gradlew test
```

Deployed Selenium:

```bash
cd verification/selenium-verifier
.venv\Scripts\python -m pytest tests/test_live_verification.py -m live -s --html=verification-artifacts\live-report-current-ui.html --self-contained-html
```

Local Selenium:

```bash
cd verification/selenium-verifier
.venv\Scripts\python -m pytest tests/test_live_verification.py -m live -s --html=verification-artifacts\local-report-current-ui.html --self-contained-html
```

## Results

### Build and Unit Test Results

- frontend `npm test`: passed
- frontend `npm run build`: passed on host Node `20.16.0`, with the expected Vite upgrade warning
- frontend `npm run lint`: passed
- frontend `npm test` under Node `20.19.0`: passed
- frontend `npm run build` under Node `20.19.0`: passed
- frontend `npm run lint` under Node `20.19.0`: passed
- Auth/Profile `./gradlew test`: passed

### Deployed Health Checks

Direct deployed checks passed:

- frontend root: `200`
- frontend `/status`: `ok`
- auth health: `UP`
- inventory health: `UP`
- wallet health: `UP`
- order health: `UP`
- voucher health: `UP`

### Deployed Smoke Verification

Verified against the deployed frontend and live services:

- buyer login
- catalog browse
- product detail
- wallet top-up
- checkout with voucher
- buyer order history
- buyer order detail
- valid lifecycle progression `PAID -> PURCHASED -> SHIPPED -> COMPLETED`
- invalid lifecycle transition rejection for `PAID -> COMPLETED`
- buyer rating after completion
- cancel and refund
- repeated cancel with no double refund
- wallet transaction history for top-up, payment, and refund
- admin order monitoring
- admin voucher create, update, disable
- disabled voucher hidden from the public active list

### Selenium Deployed Result

Final deployed run:

- status: passed
- scenarios: `6/6`
- browser: `edge` headless

Final evidence set:

- summary: [verification-artifacts/20260504-022136/summary.json](./verification/selenium-verifier/verification-artifacts/20260504-022136/summary.json)
- html report: [verification-artifacts/live-report-current-ui.html](./verification/selenium-verifier/verification-artifacts/live-report-current-ui.html)

One earlier rerun failed during Cloud Run warm-up after the frontend deployment. The final rerun above is the authoritative deployed result.

## Local Selenium Status

Final local run:

- status: passed
- scenarios: `6/6`
- browser: `edge` headless
- frontend URL: `http://localhost:5173`

Local evidence set:

- summary: [verification-artifacts/20260504-020331/summary.json](./verification/selenium-verifier/verification-artifacts/20260504-020331/summary.json)
- html report: [verification-artifacts/local-report-current-ui.html](./verification/selenium-verifier/verification-artifacts/local-report-current-ui.html)

Earlier local reruns failed for two reasons that are now fixed:

- `127.0.0.1` did not match the default backend CORS origin list.
- generic product selection could assign a lifecycle order to the wrong jastiper owner when seeded stock drifted.

The final local run uses `http://localhost:5173`, the seeded `jastiper3@json.app` account, and the seeded product `55555555-5555-5555-5555-555555555555` for deterministic ownership.

## Concurrency Verification Boundary

Concurrent inventory, voucher, and wallet robustness remains covered by the backend service tests already passing in the milestone handoff, plus the optional verifier concurrency runner.

Those destructive concurrency checks were not run against the shared Cloud Run demo deployment. Use `verification/selenium-verifier/scripts/run_concurrency.py` only for controlled local or staging verification with `INTERNAL_API_TOKEN` and, for voucher checks, `VOUCHER_ADMIN_TOKEN`.

## Required Local or Demo Inputs

- `VOUCHER_ADMIN_TOKEN` is required for the admin voucher scenario.
- The token value used for deployed verification was read from Cloud Run configuration locally and was not committed into source control.
- The frontend no longer supports a `VITE_` voucher admin token path. Token entry is runtime-only.
- Demo-role accounts require `APP_DEMO_SEED_ENABLED=true` when running a local demo stack.

## Evidence Notes

Verifier artifacts include:

- scenario screenshots
- raw API request and response JSON for state proof
- per-scenario `details.json` or `failure.json`
- run `summary.json`

The final passing run is the authoritative evidence set for this deployment follow-up.
