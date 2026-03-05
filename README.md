# AdvProg 2026 A04 - Frontend

Shared frontend application for our microservice-based project, built with **React + Vite**.

## Tech Stack

- **React 19** - UI library
- **Vite 7** - Build tool & dev server
- **React Router 7** - Client-side routing
- **Axios** - HTTP client for backend API calls

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/advprog-2026-A04-project/frontend.git
cd frontend

# 2. Install dependencies
npm install

# 3. Copy environment file and update URLs
cp .env.example .env

# 4. Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── api/                    # Axios instances per microservice
│   └── axiosInstance.js    # Pre-configured axios with JWT interceptors
├── components/             # Shared/reusable components
│   ├── Layout.jsx          # Main layout with Navbar + Outlet
│   └── Navbar.jsx          # Navigation bar
├── features/               # Feature modules (one per microservice)
│   ├── auth-profile/       # Login, Register, Profile pages
│   ├── order/              # Order list, Order detail pages
│   ├── voucher-promo/      # Voucher & promo pages
│   ├── wallet/             # Wallet pages
│   └── inventory/          # Inventory/product pages
├── pages/                  # Top-level pages (Home, 404)
├── App.jsx                 # Root component with routing
├── main.jsx                # Entry point
└── index.css               # Global styles
```

## Team Workflow

Each team member works primarily in their own feature folder under `src/features/`:

| Member | Feature Folder | Backend Repo |
|--------|---------------|--------------|
| Member 1 | `src/features/auth-profile/` | Auth-Profile |
| Member 2 | `src/features/order/` | Order |
| Member 3 | `src/features/voucher-promo/` | Voucher-Promo |
| Member 4 | `src/features/wallet/` | Wallet |
| Member 5 | `src/features/inventory/` | Inventory |

### Git Branching Strategy

1. **Always create a feature branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/order-list
   ```
2. **Push your branch** and create a **Pull Request** to `main`
3. **Get at least 1 review** before merging
4. **Never push directly to `main`**

### Adding API Calls

Import the pre-configured axios instance for your microservice:

```jsx
import { orderApi } from '../../api/axiosInstance';

// Example: fetch orders
const response = await orderApi.get('/api/orders');
```

## Environment Variables

Copy `.env.example` to `.env` and update the URLs to match your local backend ports:

```
VITE_AUTH_PROFILE_URL=http://localhost:8081
VITE_ORDER_URL=http://localhost:8082
VITE_VOUCHER_PROMO_URL=http://localhost:8083
VITE_WALLET_URL=http://localhost:8084
VITE_INVENTORY_URL=http://localhost:8085
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
