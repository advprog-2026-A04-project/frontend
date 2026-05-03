# Milestone 75 Deployment Verification

## Scope

This document records the Milestone `75%` deployment, deployed smoke verification, and Selenium evidence for:

- `services/frontend`
- `services/Order`
- `services/Auth-Profile`

## Target Platform

Google Cloud Run, region `us-central1`

## Deployed Services

Frontend:

- URL: `https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app`
- Revision: `advprog-frontend-m25-m50-00007-kkm`
- Revision created at: `2026-05-03T17:05:41.030951Z`
- Commit deployed: `a2653f5` (`Add Selenium milestone 75 tests`)

Auth/Profile:

- URL: `https://auth-profile-api-osvihgaoya-uc.a.run.app`
- Revision: `auth-profile-api-00005-c95`
- Revision created at: `2026-05-03T17:00:48.304592Z`
- Commit deployed: `5a80c75` (`Make demo account seeding explicit`)

Order:

- URL: `https://order-api-osvihgaoya-uc.a.run.app`
- Revision: `order-api-00005-bjr`
- Revision created at: `2026-05-03T17:04:05.447586Z`
- Commit deployed: `4ad26bf` (`Update order deployment notes`)

Supporting services used by the deployed frontend:

- Inventory: `https://inventory-api-osvihgaoya-uc.a.run.app` (`inventory-api-00003-gs7`)
- Wallet: `https://wallet-api-osvihgaoya-uc.a.run.app` (`wallet-api-00003-77s`)
- Voucher: `https://voucher-promo-api-osvihgaoya-uc.a.run.app` (`voucher-promo-api-00006-2rp`)

Verification timestamp recorded locally:

- `2026-05-04T00:09:44.3069963+07:00`

## Deployment Commands Run

The final deployment pass was run after creating the follow-up commits above so the live revisions align with committed source.

Auth/Profile:

```bash
gcloud run deploy auth-profile-api --source . --region us-central1 --allow-unauthenticated --max-instances=1 --update-env-vars APP_DEMO_SEED_ENABLED=true --quiet
```

Order:

```bash
gcloud run deploy order-api --source . --region us-central1 --allow-unauthenticated --max-instances=1 --quiet
```

Frontend:

```bash
gcloud run deploy advprog-frontend-m25-m50 --source . --region us-central1 --allow-unauthenticated --quiet
```

## Frontend Environment Contract

The deployed frontend build uses the direct-service Vite variables from `.env.production`:

- `VITE_AUTH_BASE_URL`
- `VITE_INVENTORY_BASE_URL`
- `VITE_WALLET_BASE_URL`
- `VITE_ORDER_BASE_URL`
- `VITE_VOUCHER_BASE_URL`

The frontend build does not embed the voucher admin token. The admin UI now requires manual token entry at runtime and masks the field to avoid exposing the token in screenshots.

## Auth Demo Account Safety

`APP_DEMO_SEED_ENABLED` now defaults to `false` in code.

For the public milestone demo deployment, Cloud Run was explicitly updated with:

```env
APP_DEMO_SEED_ENABLED=true
```

This keeps seeded buyer/jastiper/admin demo accounts available for the deployed milestone demo while avoiding silent seeding in production-like environments by default. Legacy compatibility with `APP_DEMO_ACCOUNTS_ENABLED` is still supported, but new deployments should use `APP_DEMO_SEED_ENABLED`.

## Test and Build Commands

Frontend:

```bash
npm test
npm run build
npm run lint
```

Auth/Profile:

```bash
./gradlew test
```

Order:

```bash
cd backend
./gradlew test
```

Deployed Selenium:

```bash
cd verification/selenium-verifier
.venv\Scripts\pytest tests/test_live_verification.py -m live -s --html=verification-artifacts\live-report-final.html --self-contained-html
```

## Results

### Build and Unit Test Results

- frontend `npm test`: passed
- frontend `npm run build`: passed
- frontend `npm run lint`: passed
- Auth/Profile `./gradlew test`: passed
- Order `backend/./gradlew test`: passed

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
- browser: `chrome` headless

Final evidence set:

- summary: [verification-artifacts/20260504-000722/summary.json](./verification/selenium-verifier/verification-artifacts/20260504-000722/summary.json)
- html report: [verification-artifacts/live-report-final.html](./verification/selenium-verifier/verification-artifacts/live-report-final.html)

Intermediate failed reruns were kept as raw evidence during selector stabilization and are not the final verdict.

## Local Selenium Status

At follow-up verification time:

- frontend local dev server on `5173` was reachable
- local backend ports `8081` to `8085` were not running

The local Selenium suite was therefore prepared but not rerun in this follow-up because the local multi-service stack was not live.

## Concurrency Verification Boundary

Concurrent inventory, voucher, and wallet robustness remains covered by the backend service tests already passing in the milestone handoff, plus the optional verifier concurrency runner.

Those destructive concurrency checks were not run against the shared Cloud Run demo deployment. Use `verification/selenium-verifier/scripts/run_concurrency.py` only for controlled local or staging verification with `INTERNAL_API_TOKEN` and, for voucher checks, `VOUCHER_ADMIN_TOKEN`.

## Required Local or Demo Inputs

- `VOUCHER_ADMIN_TOKEN` is required for the admin voucher scenario.
- The token value used for deployed verification was read from Cloud Run configuration locally and was not committed into source control.
- The frontend no longer supports a `VITE_` voucher admin token path. Token entry is runtime-only.
- Demo-role accounts require `APP_DEMO_SEED_ENABLED=true` or the `demo` Spring profile in Auth when running a local demo stack.

## Evidence Notes

Verifier artifacts include:

- scenario screenshots
- raw API request/response JSON for state proof
- per-scenario `details.json` or `failure.json`
- run `summary.json`

The final passing run is the authoritative evidence set for this deployment follow-up.
