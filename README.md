# Frontend Milestone 75

Real frontend for JSON / JaStip Online Nasional Milestone `75%`.

## Scope

Implemented buyer, jastiper, and admin flows:

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

This frontend talks directly to the deployed microservices. Checkout orchestration remains in the Order service.

## Runtime

- React + Vite
- Express static server for Cloud Run runtime
- direct browser calls to Auth, Inventory, Wallet, Order, and Voucher services

## Local Setup

Recommended runtime: Node `20.19+`

1. Install dependencies:

```bash
npm install
```

2. Copy env values:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Start the frontend:

```bash
npm run dev
```

Default local URLs:

- frontend: `http://localhost:5173`
- static runtime server: `http://localhost:8080`

Local backend defaults expected by the Vite client:

- auth: `http://localhost:8081`
- inventory: `http://localhost:8082`
- wallet: `http://localhost:8083`
- order: `http://localhost:8084`
- voucher: `http://localhost:8085`

If local demo accounts are needed, the Auth service must be started with `APP_DEMO_ACCOUNTS_ENABLED=true`.

## Environment Variables

Build-time Vite variables:

- `VITE_AUTH_BASE_URL`
- `VITE_INVENTORY_BASE_URL`
- `VITE_WALLET_BASE_URL`
- `VITE_ORDER_BASE_URL`
- `VITE_VOUCHER_BASE_URL`
- `VITE_VOUCHER_ADMIN_TOKEN` optional demo-only convenience default for the admin page

Runtime server variables:

- `PORT`
- `VOUCHER_BASE_URL`
- `DEMO_VOUCHER_CODE`

Do not put private admin tokens or service secrets into the frontend build.

## Commands

```bash
npm run dev
npm run lint
npm run test
npm run build
npm start
```

## Deployment

Target platform: Google Cloud Run.

The production build reads `.env.production` during `npm run build`. The committed production env points at the deployed Cloud Run services:

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

- `VITE_VOUCHER_ADMIN_TOKEN` should only be used for local or public demo environments.
- The frontend assumes backend CORS allows the deployed frontend origin.
- The Express runtime still contains the old demo-only `/api/*` handlers, but the Milestone 75 UI uses the direct service client in `src/lib/api.js`.
