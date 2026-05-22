# Software Design

## Principles Applied

The project is split into small services with a thin React frontend and domain-specific Spring services. Controllers stay close to HTTP concerns, service classes own business rules, repositories own persistence, and API clients isolate cross-service calls.

Design decisions used in the final pass:

| Principle | Evidence | Benefit |
|---|---|---|
| Single responsibility | Auth/Profile, Inventory, Order, Wallet, Voucher, and frontend each own separate behavior | Reduces cross-service edits and makes grading evidence clearer. |
| Dependency inversion | Order depends on inventory, wallet, and voucher client abstractions instead of embedding remote HTTP calls in controllers | Checkout flow can be tested with mocked collaborators. |
| Defensive idempotency | Checkout, wallet deduction/refund, stock mutation, and voucher claim use deterministic request/order identifiers | Retry and double-submit risks are controlled. |
| Secure defaults | Admin voucher token is runtime input and is not committed into frontend build variables | Avoids exposing privileged tokens in public static assets. |

## Design Patterns

| Pattern | Where used | Why it is appropriate |
|---|---|---|
| Repository | Spring Data repositories in backend services | Encapsulates persistence and keeps service logic independent of database access details. |
| Service/Facade | Service classes such as checkout orchestration, wallet transaction service, voucher management service | Gives controllers a stable business API and centralizes validation. |
| Adapter client | Order service clients for Inventory, Wallet, and Voucher; frontend `src/lib/api.js` | Converts external service contracts into local application calls and keeps integration changes localized. |
| Strategy/Policy | Voucher validity, discount, quota, and visibility rules | Keeps policy decisions testable without mixing them with controller request handling. |
| Mapper/Factory | DTO builders and frontend model mapping | Separates internal entity shape from API/UI response shape. |
| Idempotency record | Order checkout and payment/refund boundaries | Provides retry-safe behavior for high-risk write flows. |

## Before/After Design Improvements

| Area | Before | After |
|---|---|---|
| Checkout retry behavior | Duplicate submits could create repeated downstream effects | Selenium and backend tests verify duplicate checkout produces one paid order/payment path. |
| Frontend/backend integration | Frontend fallback URLs referenced stale Cloud Run hostnames | `src/lib/api.js` now targets current deployed Cloud Run services. |
| Deploy configuration | CD jobs depended on raw secret formatting and direct project secret substitution | Workflows use the authenticated gcloud project, normalize JDBC URL values, and skip malformed Cloud SQL attachment values without printing secrets. |
| Selenium demo mode | Browser verifier was mostly CI-focused | `SELENIUM_DEMO_SLOW=true` makes browser runs watchable for grading while preserving headless CI behavior. |

## Non-Functional Quality Effort

| Concern | Evidence |
|---|---|
| Reliability | Idempotency and regression tests around checkout, refund, voucher claim, and stock mutation. |
| Maintainability | Separate docs for architecture, deployment, quality, and final rubric evidence. |
| Security | Runtime-only admin token handling, GitHub OIDC deploy authentication, no secret values in docs or committed config. |
| Performance | Cloud Run profile script and performance evidence folder; checkout and voucher paths avoid repeated downstream work through idempotency. |

