# Final Rubric Check

Snapshot date: 2026-05-22.

This document is the final evidence index for the AdvProg A04 project. It is intentionally conservative: a requirement is marked `PARTIAL` when the implementation exists but the public evidence depends on a currently running GitHub Actions or Google Cloud deployment check.

## Repository Audit

| Repository | Role | Tests and quality | CI/CD | Deployment evidence |
|---|---|---|---|---|
| Auth-Profile | Authentication, roles, profile | Gradle `check bootJar` passed locally; JaCoCo line 100%, branch 96.05% | CI and CD workflows exist | Cloud Run `auth-profile-api` |
| Inventory | Catalog, stock, jastiper inventory | Gradle `check bootJar` passed locally; JaCoCo line 100%, branch 98.28%; PMD/Checkstyle | CI, CodeQL, CD workflows exist | Cloud Run `inventory-api` |
| Order | Checkout, order lifecycle, ratings, refunds | Gradle `check bootJar` passed locally; JaCoCo line 95.48%, branch 90.09% | CI, CodeQL, Scorecard, CD workflows exist | Cloud Run `order-api` |
| Wallet | Balance, top up, payment, refund | Gradle `check bootJar` passed locally; JaCoCo line 98.65%, branch 98.39% | CI and CD workflows exist; main promotion is staging-gated | Cloud Run `wallet-api` |
| Voucher-Promo | Voucher validation, claim, admin management | Gradle `check :backend:bootJar` passed locally; JaCoCo line 100%, branch 94.44%; PMD/CodeQL | CI, PMD, CodeQL, dependency review, deploy workflows exist | Cloud Run `voucher-promo-api` |
| frontend | React UI and Selenium verifier | `npm run lint`, `npm run test`, `npm run build` passed locally; Vitest line 39.73%, branch 38.76%; live Selenium 32/32 passed | CI/CD and manual live Selenium artifact workflows exist | Cloud Run `advprog-frontend-m25-m50` |

Non-application repositories (`group-preparation`, `individual-preparation`, `backup`, tutorial/JSON backups) were inspected as preparation or backup material and are not the deployed runtime.

## Cloud Run URLs

| Service | URL |
|---|---|
| Frontend | https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app |
| Auth/Profile | https://auth-profile-api-osvihgaoya-uc.a.run.app |
| Inventory | https://inventory-api-osvihgaoya-uc.a.run.app |
| Order | https://order-api-osvihgaoya-uc.a.run.app |
| Wallet | https://wallet-api-osvihgaoya-uc.a.run.app |
| Voucher/Promo | https://voucher-promo-api-osvihgaoya-uc.a.run.app |

## Final Requirement Table

| Requirement | Evidence | Status | Notes |
|---|---|---|---|
| All milestone target features implemented and integrated | UI flows for auth/profile, catalog, wallet top-up request and admin approval, checkout, order lifecycle, voucher admin, staff/jastiper, and admin monitoring; Selenium verifier covers these flows | PASS | Frontend fallback API URLs point at current Cloud Run services. |
| CI/CD exists and is green | Per-repo GitHub Actions for build/test/quality/deploy; latest final Auth/Profile, Order, Inventory, Wallet, Voucher, and frontend runs are green | PASS | Live Selenium also has a manual artifact workflow in `.github/workflows/live-selenium.yml`. |
| Code quality reports exist | JaCoCo, PMD, Checkstyle, CodeQL, OSSF Scorecard or dependency review where configured | PASS | Backend coverage gates are at or above 90%; frontend unit coverage is below 90% and is covered by Selenium evidence. |
| Unit and integration tests cover features | Backend service checks passed locally; frontend Vitest passed | PASS | Coverage numbers are listed in `docs/SOFTWARE_QUALITY.md`. |
| Functional testing uses Selenium/equivalent | `verification/selenium-verifier` ran 32/32 live browser scenarios against Cloud Run | PASS | Final local report: `verification-artifacts/live-report-final-32.html`; supports headless CI and `SELENIUM_DEMO_SLOW=true` for a watchable demo. |
| Public report artifacts accessible | GitHub Actions artifacts and local generated reports | PASS | Manual live Selenium workflow uploads `live-selenium-artifacts`; local final report is `verification-artifacts/live-report-final-32.html`. |
| Quality/coverage >= 90% where applicable | Backend JaCoCo line/branch gates; frontend lint/build/test | PASS for backend, PARTIAL for frontend | Frontend unit coverage is intentionally not claimed as 90%. |
| Profiling/APDEX/Lighthouse/Clarity evidence | Performance profile script, Cloud Run timing artifact, Lighthouse command path, usability evidence via Selenium | PARTIAL | APDEX and Clarity-style evidence are documented but require traffic/dashboard review for final oral demo. |
| Monitoring for app and database performance | Cloud Run metrics, health endpoints, actuator health, Cloud SQL metrics where attached | PARTIAL | Application health is verifiable. Full database dashboard export is not complete for every service. |
| At least 3 design patterns documented | Repository, service/orchestrator, adapter client, policy/strategy, mapper/factory, idempotency record | PASS | See `docs/SOFTWARE_DESIGN.md`. |
| Architecture documented | C4/container view and checkout/refund sequence | PASS | See `docs/SOFTWARE_ARCHITECTURE.md`. |
| Deployment not localhost only | Cloud Run URLs above | PASS | All runtime repos target Cloud Run. |
| Deployment automation and rollback strategy | GitHub Actions deploy workflows; Cloud Run revision rollback commands | PASS | See `docs/DEPLOYMENT_AND_MONITORING.md`. |

## Remaining Risks

| Risk | Impact | Mitigation for demo |
|---|---|---|
| Frontend unit coverage is below 90% | Rubric may prefer numeric coverage for all repos | Present backend 90%+ JaCoCo plus 32 Selenium scenarios as functional frontend evidence. Current frontend line coverage is 39.73%. |
| Full APDEX and Clarity evidence is not fully automated | High-score performance/usability evidence may be partial | Show Cloud Run latency metrics, performance profile artifact, Lighthouse output if generated, and Selenium usability flow screenshots. |
| Cloud SQL migration automation is strongest in Voucher, weaker in other services | Deployment provisioning score may be partial | Explain the current Hibernate-managed schema and recommend Flyway/Liquibase as next hardening step. |
