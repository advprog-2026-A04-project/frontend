# Selenium Verifier

Standalone verifier for the milestone `25%` and `50%` flows using:

- Selenium for the real deployed frontend
- direct HTTP assertions against the real deployed microservices
- a separate concurrency runner for Inventory, Wallet, and Voucher

This verifier does not mock backend responses and does not replace the real microservices with adapters.

## What It Verifies

`pytest` live scenarios:
- health and environment sanity
- register, login, authenticated session persistence, and logout
- catalog and product detail consistency against Inventory API
- wallet balance consistency and top-up behavior
- successful checkout with before/after proof for stock, balance, voucher quota, order state, discount, and total paid
- failed checkout with insufficient balance and unchanged downstream state proof
- direct voucher validation checks for valid and invalid codes

Separate concurrency runner:
- Inventory live service-level stock race with `20-50` workers
- Wallet live service-level deduct race with `20-50` workers
- Voucher live service-level claim race with `20-50` workers

## Folder Layout

```text
verification/selenium-verifier
|-- .env.example
|-- README.md
|-- requirements.txt
|-- pytest.ini
|-- scripts/
|   `-- run_concurrency.py
|-- tests/
|   |-- conftest.py
|   `-- test_live_verification.py
`-- verifier/
    |-- browser.py
    |-- clients/
    |-- concurrency.py
    |-- config.py
    |-- evidence.py
    |-- models.py
    |-- pages/
    |-- sanity.py
    `-- setup_helpers.py
```

## Setup

1. Create and activate a Python virtual environment.
2. Install dependencies.
3. Copy `.env.example` to `.env`.
4. Fill in any needed tokens.

```bash
cd verification/selenium-verifier
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
```

## Required Environment Variables

```env
FRONTEND_BASE_URL=https://advprog-frontend-m25-m50-383620816191.us-central1.run.app
AUTH_BASE_URL=https://auth-profile-api-383620816191.us-central1.run.app
INVENTORY_BASE_URL=https://inventory-api-383620816191.us-central1.run.app
WALLET_BASE_URL=https://wallet-api-383620816191.us-central1.run.app
ORDER_BASE_URL=https://order-api-383620816191.us-central1.run.app
VOUCHER_BASE_URL=https://voucher-promo-api-383620816191.us-central1.run.app
VOUCHER_ADMIN_TOKEN=...
INTERNAL_API_TOKEN=...
HEADLESS=false
BROWSER=edge
DEFAULT_TOPUP_AMOUNT=1000000
DEFAULT_PRODUCT_ID=66666666-6666-6666-6666-666666666666
DEFAULT_VOUCHER_CODE=MILESTONE10
SHIPPING_ADDRESS=Jl. Mawar No. 1, Jakarta
ARTIFACTS_ROOT=verification-artifacts
CONCURRENCY_WORKERS=25
CONCURRENCY_PRODUCT_ID=66666666-6666-6666-6666-666666666666
AUTO_DETECT_FRONTEND_ORIGIN=true
```

Notes:
- `VOUCHER_ADMIN_TOKEN` is required only when no usable active voucher exists by default, or when running voucher concurrency verification.
- `INTERNAL_API_TOKEN` is required for direct voucher validation and the concurrency runner.
- `FRONTEND_BASE_URL` should point to the working canonical frontend origin.

## Run Against Deployed Environment

UI plus direct API verification:

```bash
cd verification/selenium-verifier
.venv\Scripts\activate
pytest tests/test_live_verification.py -m live -s --html=verification-artifacts\live-report.html --self-contained-html
```

Separate concurrency verification:

```bash
cd verification/selenium-verifier
.venv\Scripts\activate
python scripts/run_concurrency.py
```

## Run Against Local Multi-Service Mode

The verifier also supports local mode if all real services are running locally and their URLs are pointed through `.env`.

Typical local values:

```env
FRONTEND_BASE_URL=http://localhost:5173
AUTH_BASE_URL=http://localhost:8081
INVENTORY_BASE_URL=http://localhost:8082
WALLET_BASE_URL=http://localhost:8083
ORDER_BASE_URL=http://localhost:8084
VOUCHER_BASE_URL=http://localhost:8085
```

Local mode prerequisites:
- real frontend running on the configured URL
- all five microservices running
- backend CORS includes the configured frontend origin
- valid `INTERNAL_API_TOKEN` and `VOUCHER_ADMIN_TOKEN` if those paths are exercised

## Evidence Output

Each run writes artifacts under:

```text
verification-artifacts/<timestamp>/
```

Artifacts include:
- scenario screenshots
- raw HTTP request/response JSON for critical calls
- `before_state.json` and `after_state.json` for checkout scenarios
- `details.json` or `failure.json` per scenario
- session `summary.json`

The concurrency runner writes its own timestamped summary under:

```text
verification-artifacts/concurrency/<timestamp>/
```

## Example Evidence Produced

Successful checkout scenario writes:
- wallet before and after top-up
- chosen product payload
- active or created voucher payload
- voucher validation response
- checkout `before_state.json`
- checkout `after_state.json`
- order detail payload
- screenshots for wallet, product detail, checkout, result, and orders

Failed checkout scenario writes:
- before-state snapshot
- direct API preflight failure payload
- unchanged after-state snapshot
- screenshot of the UI failure notice

## Strict Verdicts

Each scenario is recorded as one of:
- `VERIFIED`
- `FAILED`

The summary file also records exact before/after values for successful and failed checkout scenarios.

## Limitations

- The concurrency runner is honest about scope: it verifies live deployed service-level invariants, not full cross-service orchestration under concurrency.
- The verifier does not auto-discover hidden frontend origins from Cloud Run metadata. It checks the configured origin and fails fast if backend CORS rejects it.
- The live tests create throwaway users and real orders on the configured environment.

## Production Changes

No production code changes are required by this verifier itself.
