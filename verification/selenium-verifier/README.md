# Selenium Verifier

Milestone `75%` Selenium and live-service verifier for the frontend repo.

It runs against either:

- the local multi-service stack
- the deployed Cloud Run stack

The verifier uses:

- Selenium for the real browser flow
- direct HTTP assertions against the real services for state proof

## Covered Flows

- frontend reachability and backend health/CORS
- buyer login
- catalog and product detail
- wallet top-up and transaction history
- checkout with voucher
- buyer order history and order detail
- invalid lifecycle transition rejection
- valid `PAID -> PURCHASED -> SHIPPED -> COMPLETED`
- buyer rating after completion
- cancel and refund
- repeated cancel without double refund
- admin voucher create, edit, disable
- disabled voucher hidden from the public active list

Concurrency verification remains in the backend services and in the optional concurrency runner here. Do not run destructive concurrency checks against shared demo deployments unless you intend to mutate shared data.

## Setup

```bash
cd verification/selenium-verifier
python -m venv .venv
.venv\Scripts\activate
nvm use
python -m pip install -r requirements.txt
copy .env.example .env
```

## Required Environment Variables

Required for the main Milestone 75 suite:

```env
FRONTEND_BASE_URL=
AUTH_BASE_URL=
INVENTORY_BASE_URL=
WALLET_BASE_URL=
ORDER_BASE_URL=
VOUCHER_BASE_URL=
BUYER_EMAIL=
BUYER_PASSWORD=
JASTIPER_EMAIL=
JASTIPER_PASSWORD=
ADMIN_EMAIL=
ADMIN_PASSWORD=
VOUCHER_ADMIN_TOKEN=
```

Optional:

```env
HEADLESS=true
BROWSER=edge
DEFAULT_TOPUP_AMOUNT=1000000
DEFAULT_PRODUCT_ID=
DEFAULT_VOUCHER_CODE=MILESTONE10
SHIPPING_ADDRESS=Jl. Mawar No. 1, Jakarta
ARTIFACTS_ROOT=verification-artifacts
INTERNAL_API_TOKEN=
CONCURRENCY_WORKERS=25
CONCURRENCY_PRODUCT_ID=
AUTO_DETECT_FRONTEND_ORIGIN=true
```

Notes:

- The demo credentials in `.env.example` are only for the documented local/demo deployment.
- `VOUCHER_ADMIN_TOKEN` is required for the admin voucher scenario.
- `INTERNAL_API_TOKEN` is not required for the main Selenium suite. It is only used by the optional concurrency runner.
- The frontend admin token is entered manually at runtime and should never be committed in a `VITE_` variable.

## Run Against Deployment

```bash
cd verification/selenium-verifier
.venv\Scripts\activate
pytest tests/test_live_verification.py -m live -s --html=verification-artifacts\live-report.html --self-contained-html
```

## Run Against Local Stack

Point the base URLs to localhost:

```env
FRONTEND_BASE_URL=http://localhost:5173
AUTH_BASE_URL=http://localhost:8081
INVENTORY_BASE_URL=http://localhost:8082
WALLET_BASE_URL=http://localhost:8083
ORDER_BASE_URL=http://localhost:8084
VOUCHER_BASE_URL=http://localhost:8085
```

If you prefer `127.0.0.1`, configure every backend service with `APP_CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173`.

For local demo-role testing, start Auth with:

```env
APP_DEMO_SEED_ENABLED=true
```

Then run the same `pytest` command.

Recommended local start commands:

```powershell
# Auth/Profile
$env:PORT='8081'; $env:APP_DEMO_SEED_ENABLED='true'; .\gradlew.bat bootRun

# Inventory
$env:PORT='8082'; .\gradlew.bat bootRun

# Wallet
$env:PORT='8083'; .\gradlew.bat bootRun

# Order (run from services/Order/backend)
$env:PORT='8084'; $env:APP_CORS_ALLOWED_ORIGINS='http://localhost:5173,http://127.0.0.1:5173'; .\gradlew.bat bootRun

# Voucher-Promo
$env:PORT='8085'; $env:SPRING_PROFILES_ACTIVE='cloudrun'; $env:ADMIN_TOKEN='<local-demo-admin-token>'; .\gradlew.bat bootRun

# Frontend
nvm use
npm run dev -- --host 127.0.0.1 --port 5173
```

## Evidence

Each run writes:

```text
verification-artifacts/<timestamp>/
```

Artifacts include:

- per-scenario screenshots
- raw request/response JSON for critical direct API checks
- `details.json` or `failure.json`
- `summary.json`

## Optional Concurrency Runner

This runner is for controlled local or staging validation, not shared public demo smoke:

```bash
python scripts/run_concurrency.py
```

It needs `INTERNAL_API_TOKEN`, and voucher concurrency also needs `VOUCHER_ADMIN_TOKEN`.

Backend concurrency suites that are safe to run locally or in staging:

```powershell
# Inventory
cd services/Inventory
.\gradlew.bat test --tests "*ProductServiceConcurrencyTest"

# Wallet
cd services/Wallet
.\gradlew.bat test --tests "*WalletDeductConcurrencyTest" --tests "*WalletServiceImplTest"

# Voucher
cd services/Voucher-Promo
.\gradlew.bat test --tests "*VoucherClaimConcurrencyTest" --tests "*VoucherClaimIdempotencyTest"
```

Do not run those destructive concurrency checks against the shared Cloud Run demo.
