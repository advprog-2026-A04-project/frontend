# Selenium Verifier

Milestone `25%`, `50%`, and `75%` Selenium and live-service verifier for the frontend repo.

It runs against either:

- the local multi-service stack
- the deployed Cloud Run stack

The verifier uses:

- Selenium for the real browser flow
- direct HTTP assertions against the real services for state proof

## Covered Flows

Current live suite scenarios:

- `health_and_environment_sanity`
- `login_catalog_with_configured_buyer`
- `invalid_login_and_logout_clears_session`
- `milestone25_register_login_browse_profile_and_alias_routes`
- `route_guards_search_filters_and_role_navigation`
- `unauthorized_role_actions_are_rejected`
- `checkout_wallet_history_and_order_views`
- `checkout_rejects_insufficient_wallet_balance_without_side_effects`
- `checkout_double_submit_creates_single_order_and_payment`
- `invalid_voucher_rejection_and_public_voucher_ui`
- `admin_voucher_rejects_missing_or_invalid_admin_token`
- `order_lifecycle_invalid_transition_and_rating`
- `admin_order_monitoring_and_checkout_visibility`
- `expired_and_quota_exhausted_vouchers_are_rejected_or_hidden`
- `cancel_refund_is_idempotent`
- `admin_voucher_management_and_public_visibility`

Milestone coverage:

- `25%`
  - landing page loads
  - register via UI
  - login via UI
  - invalid login rejection and session cleanup
  - product list and detail
  - protected route redirect to login
  - buyer profile navigation
- `50%`
  - wallet top-up and balance visibility
  - voucher-aware checkout
  - insufficient-wallet checkout rejection without balance or stock side effects
  - checkout submit-guard coverage for duplicate-click prevention
  - invalid voucher rejection in the checkout UI and backend
  - order creation to `PAID`
  - wallet history reflects `TOPUP` and `PAYMENT`
- `75%`
  - buyer order history and active order queue
  - jastiper queue and valid lifecycle transitions
  - invalid transition rejection
  - unauthorized buyer and jastiper role protection
  - rating after `COMPLETED`
  - cancel and idempotent refund
  - admin order monitoring
  - admin voucher create, edit, disable
  - expired and quota-exhausted voucher rejection and public-list behavior
  - disabled voucher removed from the public checkout list
  - wallet refund visibility

Additional current-UI coverage:

- `/browse` and `/products` alias coverage
- catalog search interaction
- role-aware profile cards for buyer, jastiper, and admin
- runtime admin-token entry path for voucher management
- session persistence across refresh and logout cleanup

Concurrency verification remains in the backend services and in the optional concurrency runner here. Do not run destructive concurrency checks against shared demo deployments unless you intend to mutate shared data.

## Setup

```bash
cd verification/selenium-verifier
python -m venv .venv
.venv\Scripts\activate
nvm use 20.19.0
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
- The default verifier jastiper is `jastiper3@json.app` because the seeded demo inventory keeps the most stable stock on that owner.
- `VOUCHER_ADMIN_TOKEN` is required for:
  - `admin_order_monitoring_and_checkout_visibility`
  - `expired_and_quota_exhausted_vouchers_are_rejected_or_hidden`
  - `admin_voucher_management_and_public_visibility`
- `admin_voucher_rejects_missing_or_invalid_admin_token` does not require the real token. It exercises the negative case only.
- `INTERNAL_API_TOKEN` is not required for the main Selenium suite. It is only used by the optional concurrency runner.
- The frontend admin token is entered manually at runtime and should never be committed in a `VITE_` variable.

## Run Commands

Run the full live suite:

```bash
cd verification/selenium-verifier
.venv\Scripts\activate
pytest tests/test_live_verification.py -m live -s --html=verification-artifacts\live-report.html --self-contained-html
```

Run only smoke coverage:

```bash
pytest tests/test_live_verification.py -m smoke -s
```

Run the core suite without edge-case scenarios:

```bash
pytest tests/test_live_verification.py -m "live and not edge" -s
```

Run only edge cases:

```bash
pytest tests/test_live_verification.py -m "live and edge" -s
```

Run admin-focused coverage:

```bash
pytest tests/test_live_verification.py -m "live and admin" -s
```

Run one scenario directly:

```bash
pytest tests/test_live_verification.py::test_invalid_login_and_logout_clears_session -s
```

## Run Against Deployment

Use deployed base URLs in `.env`, then run the full live suite or a marker slice from the commands above.

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

If the shared local inventory state is already depleted on another owner, optionally pin a seeded product that belongs to the configured jastiper:

```env
DEFAULT_PRODUCT_ID=55555555-5555-5555-5555-555555555555
```

Then run the same `pytest` command or any marker slice from the commands above.

If repeated local runs drain every seeded product to zero stock, stop the local Java services and clear the local H2 files before starting them again:

```powershell
Remove-Item C:\tmp\auth-profile-db* -Force
Remove-Item C:\tmp\inventory-db* -Force
Remove-Item C:\tmp\order-db* -Force
Remove-Item C:\tmp\wallet-db* -Force
```

If Voucher-Promo has just restarted, wait until both of these succeed before running the Selenium suite:

```powershell
Invoke-RestMethod http://localhost:8085/health
Invoke-RestMethod http://localhost:8085/vouchers/active
```

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
