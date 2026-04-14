# Frontend Milestone 25% and 50% Demo

This frontend is scoped only to Milestone `25%` and `50%`.

It demonstrates:

- register
- login
- authenticated user state
- browse products
- product detail
- wallet balance and top-up
- checkout with `voucherCode`
- inventory validation
- voucher validation
- wallet validation
- order success and failure outcomes
- my orders view

It does not implement Milestone `75%` or `100%` features such as refund flows, ratings, or a full admin workflow.

## Architecture

- React + Vite frontend
- Express BFF for frontend-safe API aggregation
- Live voucher integration against the deployed Voucher service
- Local in-memory adapters for Auth/Profile, Inventory, Wallet, and Order because their deployed environments were unavailable or did not match the documented runtime contract during verification

The app is intentionally simple and demo-ready rather than production-complete.

## Service Integration Mode

- `Voucher`: live integration via `VOUCHER_BASE_URL`
- `Auth/Profile`: local adapter
- `Inventory`: local seeded catalog and stock adapter
- `Wallet`: local wallet adapter
- `Order`: local order adapter

Current demo data is kept in memory, so it resets when the server restarts or a new instance is created.

## Demo Credentials

- Email: `demo@json.app`
- Password: `Demo123!`
- Demo voucher: `MILESTONE10`

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

PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

3. Start the app:

```bash
npm run dev
```

Development URLs:

- Frontend: `http://localhost:5173`
- BFF: `http://localhost:3001`

## Environment Variables

- `PORT`: Express server port. Default: `3001`
- `VOUCHER_BASE_URL`: Voucher service base URL
- `VOUCHER_ADMIN_TOKEN`: admin token used to ensure the demo voucher exists
- `DEMO_VOUCHER_CODE`: seeded voucher code shown in the UI

See [.env.example](./.env.example).

## Available Commands

```bash
npm run dev
npm run lint
npm run test
npm run build
npm start
```

## Testing

Automated coverage includes:

- register page flow
- login and authenticated session flow
- product browsing
- product detail to checkout flow
- voucher input and validation flow
- successful checkout result flow

Run tests with:

```bash
npm run test
```

## Manual QA Checklist

- Register a new user from `/register`
- Log in from `/login`
- Browse products from `/catalog`
- Open a product detail page
- Open `/wallet` and confirm the balance is shown
- Trigger a top-up and confirm the balance changes
- Start checkout and verify the `voucherCode` field exists
- Enter `MILESTONE10`, validate it, and confirm a discount is shown
- Complete a successful checkout and confirm the order result page shows `PAID` / `SUCCESS`
- Open `/orders` and confirm the created order is listed
- Trigger a failure path by using a quantity above stock or a cart total above wallet balance and confirm the result page shows a clear failure reason

## Deployment

This project is containerized with the included [Dockerfile](./Dockerfile) and can be deployed directly to Google Cloud Run.

Basic deploy flow:

```bash
gcloud run deploy <service-name> --source . --region us-central1 --allow-unauthenticated
```

Deployed frontend URL: `https://advprog-frontend-m25-m50-383620816191.us-central1.run.app`

## Risks and Limitations

- Voucher is the only live microservice integration in the current demo.
- Auth/Profile, Inventory, Wallet, and Order are adapter-backed because the available deployments were not reliable enough for a stable milestone demo.
- All adapter data is in memory and is not persistent across restarts.
- The app is deliberately limited to Milestone `25%` and `50%`.
