# Final Evidence Pack

Snapshot date: 2026-05-22.

This folder is the examiner-facing evidence index for the AdvProg A04 final project. It intentionally links to committed files, workflows, and reproducible commands rather than relying on undocumented claims.

## Grade Target

Current target after these fixes: 3.85-3.95 / 4, with 3.9 feasible after GitHub Actions artifacts are green.

## High-Value Evidence

| Area | Evidence |
| --- | --- |
| Frontend unit coverage | `npm run test` passed with global thresholds: statements 93.76%, branches 90.79%, functions 91.11%, lines 94.75% |
| Selenium functional testing | Full live suite passed locally: 32/32 scenarios in 374.69s |
| Selenium workflow artifact | `.github/workflows/live-selenium.yml`, artifact name `live-selenium-artifacts` |
| CI/CD deployment | `.github/workflows/ci-cd.yml` deploys Cloud Run and uploads coverage/smoke artifacts |
| Security/quality workflows | CodeQL, OSSF Scorecard, dependency review, ESLint, Vitest, npm audit |
| Vulnerability scan | `npm audit --omit=optional` returned 0 vulnerabilities |
| APDEX/load/profiling | `reports/performance/performance-apdex-report.md`, `performance-apdex-current.json`, `cloudrun-smoke.cpuprofile` |
| Monitoring | `monitoring/cloud-run-dashboard.json`, `monitoring/database-observability-dashboard.json` |
| Lighthouse | `.github/workflows/lighthouse.yml`, artifact name `lighthouse-reports` |
| Documentation | `docs/FINAL_RUBRIC_CHECK.md`, `docs/SOFTWARE_QUALITY.md`, `docs/DEPLOYMENT_AND_MONITORING.md` |

## Local Evidence Commands

```powershell
npm run test
npm run lint
npm run build
npm audit --omit=optional
npm run perf:evidence
cd verification/selenium-verifier
python -m pytest tests/test_live_verification.py -q --html=verification-artifacts\live-report-local.html --self-contained-html
```

## Push/Workflow Evidence To Show After Push

After pushing, open GitHub Actions and confirm these workflows are green:

- `CI/CD`
- `Live Selenium Verification`
- `Performance Evidence`
- `Lighthouse`
- `CodeQL`
- `OSSF Scorecard`
- `Dependency Review` on pull requests

Required artifact names:

- `frontend-coverage`
- `live-selenium-artifacts`
- `performance-apdex-profiling`
- `lighthouse-reports`
- `scorecard-sarif`

## Secret Handling

`VOUCHER_ADMIN_TOKEN` is stored only in:

- local ignored file: `verification/selenium-verifier/.env`
- GitHub Actions repository secret: `VOUCHER_ADMIN_TOKEN`

It must not be committed.
