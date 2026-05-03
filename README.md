# Frontend Milestone 75

Real frontend for JSON / JaStip Online Nasional Milestone `75%`.

## Frontend Source Decision

The current website UI follows the newer attached frontend source:

- `remix_-json-limited-drops (1).zip`

The previous frontend implementation is still reused where it was already proven:

- centralized API integration in `src/lib/api.js`
- route contracts and role guards
- environment variables and deployment config
- Selenium verification
- backend compatibility for admin and jastiper operations

That split is intentional. The newer attached frontend wins for buyer-facing UI and layout. The previous frontend only supplies the data layer and operational flows that the newer UI did not include.

## Scope

Implemented flows:

- landing page
- register and login
- product browse and search
- product detail
- wallet balance, top-up, and transaction history
- checkout with voucher code
- buyer order history and active orders
- order detail and rating after completion
- jastiper lifecycle processing
- admin voucher management
- admin order monitoring

Checkout orchestration remains in the Order service.

## Runtime

- React + Vite
- static build served by `nginx`
- direct browser calls to Auth, Inventory, Wallet, Order, and Voucher services

## Local Setup

Required runtime: Node `20.19.0+`.

The repo pins that version in `.nvmrc`, and the production Dockerfile already uses `node:20.19-alpine`.

1. Install the required Node runtime:

```bash
nvm install 20.19.0
nvm use 20.19.0
```

2. Install dependencies:

```bash
npm install
```

3. Copy local build variables if you want to override the built-in defaults:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Start the frontend:

```bash
npm run dev
```

Default URL behavior without a committed `.env.production`:

- browser on `localhost` or `127.0.0.1`: uses local service defaults
- deployed browser origin: uses the deployed Cloud Run service URLs baked into `src/lib/api.js`

Local backend defaults expected by the Vite client:

- auth: `http://localhost:8081`
- inventory: `http://localhost:8082`
- wallet: `http://localhost:8083`
- order: `http://localhost:8084`
- voucher: `http://localhost:8085`

If local demo accounts are needed, start Auth with `APP_DEMO_SEED_ENABLED=true`.

## Environment Variables

Optional build-time Vite variables:

- `VITE_AUTH_BASE_URL`
- `VITE_INVENTORY_BASE_URL`
- `VITE_WALLET_BASE_URL`
- `VITE_ORDER_BASE_URL`
- `VITE_VOUCHER_BASE_URL`

Leave these blank unless you intentionally want to override the built-in defaults.

Do not put private admin tokens or service secrets into the frontend build.

The admin page now requires manual voucher admin token input at runtime. Real admin tokens must stay in Cloud Run env or local shell env only. They must not be committed in `.env`, `.env.production`, or any `VITE_` variable.

## Commands

```bash
npm run dev
npm run lint
npm run test
npm run build
```

## Deployment

Target platform: Google Cloud Run.

The production build does not rely on a committed `.env.production`. It uses either explicit `VITE_*` overrides or the deployed Cloud Run fallbacks in `src/lib/api.js`:

- auth: `https://auth-profile-api-osvihgaoya-uc.a.run.app`
- inventory: `https://inventory-api-osvihgaoya-uc.a.run.app`
- wallet: `https://wallet-api-osvihgaoya-uc.a.run.app`
- order: `https://order-api-osvihgaoya-uc.a.run.app`
- voucher: `https://voucher-promo-api-osvihgaoya-uc.a.run.app`

Basic deploy:

```bash
gcloud run deploy advprog-frontend-m25-m50 --source . --region us-central1 --allow-unauthenticated
```

## Selenium Verification

Milestone 75 Selenium coverage lives in [verification/selenium-verifier](./verification/selenium-verifier).

It supports:

- local stack verification
- deployed Cloud Run verification
- screenshot capture on failure
- JSON run summaries

See the verifier README for the required environment variables and commands.

## Evidence

Deployment and verification notes are tracked in:

- [MILESTONE_75_DEPLOYMENT_VERIFICATION.md](./MILESTONE_75_DEPLOYMENT_VERIFICATION.md)

## Risks

- Voucher admin tokens must stay out of frontend source and committed env files.
- The frontend assumes backend CORS allows the deployed frontend origin.
- The public Cloud Run demo may intentionally enable demo Auth seeding through `APP_DEMO_SEED_ENABLED=true`, but that is a demo-only deployment decision and should remain disabled by default elsewhere.
