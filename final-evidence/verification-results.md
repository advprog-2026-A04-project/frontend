# Verification Results

Snapshot date: 2026-05-22.

## Frontend Unit And Coverage Gate

Command:

```powershell
npm run test
```

Result:

```text
Test Files  7 passed (7)
Tests       46 passed (46)

Statements : 93.76%
Branches   : 90.79%
Functions  : 91.11%
Lines      : 94.75%
```

Coverage enforcement:

- `vite.config.js` sets 90% global thresholds for statements, branches, functions, and lines.
- CI uploads the `coverage/**` directory as artifact `frontend-coverage`.

## Selenium Live Functional Verification

Command:

```powershell
cd verification/selenium-verifier
python -m pytest tests/test_live_verification.py -q --html=verification-artifacts\live-report-local.html --self-contained-html
```

Result:

```text
32 passed in 374.69s (0:06:14)
```

Local report:

```text
verification/selenium-verifier/verification-artifacts/live-report-local.html
```

The report directory is ignored by git to avoid committing bulky browser artifacts. The push evidence is the GitHub Actions artifact from `.github/workflows/live-selenium.yml`.

## Lint, Build, And Audit

Commands:

```powershell
npm run lint
npm run build
npm audit --omit=optional
```

Results:

```text
lint: passed
build: passed
npm audit --omit=optional: found 0 vulnerabilities
```

Note: local Node was 20.16.0, while the project and CI pin Node 20.19.0. The local build passed with a Vite engine warning; GitHub Actions uses 20.19.0.

## APDEX, Load, And Profiling

Command:

```powershell
npm run perf:evidence
```

Result:

```text
APDEX 1 with T=500ms
Load smoke p95 246.34ms across 20 requests
```

Committed evidence:

- `reports/performance/performance-apdex-report.md`
- `reports/performance/performance-apdex-current.json`
- `reports/performance/cloudrun-smoke.cpuprofile`

Workflow artifact:

- `performance-apdex-profiling`
