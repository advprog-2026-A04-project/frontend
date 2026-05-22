# Deployment And Monitoring

## Deployment Model

All runtime services deploy to Google Cloud Run in project `project-58e5335e-d6a4-4499-b08`, region `us-central1`, using the existing authenticated GitHub and gcloud sessions. Deploy workflows authenticate with Google GitHub Actions OIDC and use the project selected by the authenticated gcloud environment.

| Service | Cloud Run service | Health check |
|---|---|---|
| Frontend | `advprog-frontend-m25-m50` | `/` |
| Auth/Profile | `auth-profile-api` | `/actuator/health` |
| Inventory | `inventory-api` | `/actuator/health` |
| Order | `order-api` | `/actuator/health` |
| Wallet | `wallet-api` | `/actuator/health` |
| Voucher/Promo | `voucher-promo-api` | `/health` |

## Cloud Run URLs

| Service | URL |
|---|---|
| Frontend | https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app |
| Auth/Profile | https://auth-profile-api-osvihgaoya-uc.a.run.app |
| Inventory | https://inventory-api-osvihgaoya-uc.a.run.app |
| Order | https://order-api-osvihgaoya-uc.a.run.app |
| Wallet | https://wallet-api-osvihgaoya-uc.a.run.app |
| Voucher/Promo | https://voucher-promo-api-osvihgaoya-uc.a.run.app |

## CI/CD Workflows

| Repository | Workflow evidence |
|---|---|
| Auth-Profile | CI and CD on `main`/`staging`, Gradle check, Cloud Run deploy |
| Inventory | CI, CodeQL, CD staging/production, Gradle check, Cloud Run deploy |
| Order | CI, CodeQL, Scorecard, CD, Gradle check, Cloud Run deploy |
| Wallet | CI and CD, staging-gated main promotion, Gradle check, Cloud Run deploy |
| Voucher-Promo | CI, PMD, CodeQL, dependency review, PR policy, Google Cloud Run deploy |
| frontend | CI/CD, lint, Vitest coverage, Vite build, Cloud Run deploy, manual live Selenium artifact workflow |

Recent deploy workflow fixes:

- use authenticated `GOOGLE_CLOUD_PROJECT`/`CLOUDSDK_CORE_PROJECT` instead of relying on raw project secret substitution in `gcloud run deploy`
- normalize malformed JDBC URL values before writing `deploy.env`
- choose `org.h2.Driver` when the configured JDBC URL is H2
- skip malformed Cloud SQL attachment values without exposing secret content

## Monitoring And Observability

| Signal | Evidence |
|---|---|
| Application health | Public Cloud Run health endpoints above |
| Application performance | Cloud Run request count, latency, error count, CPU, and memory metrics in Google Cloud Console |
| Database performance | Cloud SQL metrics where Cloud SQL is attached; for H2 demo deployments, database performance is limited to app-level latency and logs |
| Logs | Cloud Run revision logs by service and revision |
| Functional observability | Selenium artifacts include screenshots, API details, and per-scenario summaries |

Wallet top-up observability is split between buyer and admin flows: buyers create pending top-up requests from `/wallet`, and admins review/approve/reject those requests from the admin console. This matches the Wallet service authorization model and avoids exposing internal service tokens in the browser.

Final functional observability evidence: `verification-artifacts/live-report-final-32.html` shows 32/32 deployed Selenium scenarios passing. The manual `Live Selenium Verification` GitHub Actions workflow publishes the same verifier output as `live-selenium-artifacts`.

Manual dashboard path:

1. Open Google Cloud Console for project `project-58e5335e-d6a4-4499-b08`.
2. Go to Cloud Run, choose each service, and open Metrics.
3. Pin request latency, request count, error count, CPU utilization, memory utilization, and container startup latency.
4. For Cloud SQL-backed services, open Cloud SQL metrics and pin CPU, memory, connections, disk utilization, and query latency where available.

## Rollback And Advanced Deployment Strategy

Cloud Run keeps revision history automatically. Rollback can be demonstrated without rebuilding:

```powershell
gcloud run revisions list --service auth-profile-api --region us-central1
gcloud run services update-traffic auth-profile-api --region us-central1 --to-revisions REVISION_NAME=100
```

The same command shape applies to `inventory-api`, `order-api`, `wallet-api`, `voucher-promo-api`, and `advprog-frontend-m25-m50`.

Advanced deployment evidence:

- Cloud Run revision rollback is available for every service.
- Wallet and Voucher main promotions are staging-gated, which gives a simple release-control boundary.
- Inventory has separate staging and production deploy jobs.
- Cloud Run canary is available through percentage traffic splitting:

```powershell
gcloud run services update-traffic order-api --region us-central1 --to-revisions OLD_REVISION=90,NEW_REVISION=10
```

## Blockers And Caveats

| Item | Status |
|---|---|
| Public Prometheus dashboard export | PARTIAL. The project relies on Cloud Run/Cloud SQL metrics rather than a committed Grafana dashboard for every service. |
| Database migration automation for every service | PARTIAL. Voucher has stronger DB provisioning evidence; other services should add Flyway or Liquibase. |
| Secret correctness | Requires existing GitHub/GCP secrets. This pass normalizes malformed values at deploy time but does not print or rewrite secret contents. |
