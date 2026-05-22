# Clarity And Usability Evidence

Snapshot date: 2026-05-22.

## Evidence Sources

- Selenium functional verifier: `verification/selenium-verifier`
- Manual live workflow: `.github/workflows/live-selenium.yml`
- Expected artifact: `live-selenium-artifacts`
- Frontend coverage and interaction tests: `src/test/*.flow.test.jsx`

## Usability-Critical Flows Covered

| Flow | Evidence |
| --- | --- |
| Guest discovery | Home page health cards, featured products, register/login calls to action |
| Buyer checkout | Login, browse, product detail, wallet balance, voucher feedback, checkout success |
| Buyer recovery | Invalid voucher, insufficient wallet, missing order/product states |
| Jastiper operations | Product create/edit/delete and order status progression |
| Admin operations | Voucher create/edit/disable, order cancel/refund, wallet approval, KYC, ban/unban |

## Clarity-Style Review Notes

- Primary workflows expose visible success/error feedback instead of silent state changes.
- Admin-only actions require an explicit voucher admin token and keep destructive actions scoped to row-level buttons.
- Empty, loading, and service-error states are rendered for catalog, wallet, checkout, orders, and admin queues.
- Selenium artifacts and Vitest flow coverage act as repeatable usability evidence for the final demo.

Microsoft Clarity is not embedded because the deployed project handles educational demo data and does not require third-party session recording. The submitted evidence is therefore usability-flow evidence, not production session-replay telemetry.
