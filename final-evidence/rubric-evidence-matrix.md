# Rubric Evidence Matrix

Snapshot date: 2026-05-22.

| Requirement | Status | Evidence |
| --- | --- | --- |
| CI/CD exists | PASS | `.github/workflows/ci-cd.yml`; backend repos also have CI/CD workflows |
| CI/CD green | READY TO VERIFY AFTER PUSH | Push and check Actions for `CI/CD` and backend CI |
| Deployment succeeds | PASS/READY | Cloud Run URLs documented in `docs/DEPLOYMENT_AND_MONITORING.md`; CI/CD deploy workflow present |
| Code quality tooling | PASS | ESLint, Vitest coverage, CodeQL, Scorecard, dependency review; backend PMD/Checkstyle/JaCoCo where configured |
| Quality reports accessible | PASS | `frontend-coverage`, `scorecard-sarif`, CodeQL Security tab, backend CI report artifacts |
| Unit tests | PASS | 46 frontend tests; backend JUnit suites |
| Functional tests | PASS | 32 Selenium live scenarios |
| Selenium exists | PASS | `verification/selenium-verifier`, `.github/workflows/live-selenium.yml` |
| Coverage >=90% | PASS | Frontend global coverage: 93.76/90.79/91.11/94.75; backend JaCoCo >=90% |
| Report artifacts accessible | PASS AFTER WORKFLOW RUN | `frontend-coverage`, `live-selenium-artifacts`, `performance-apdex-profiling`, `lighthouse-reports` |
| Monitoring exists | PASS | `monitoring/cloud-run-dashboard.json` |
| Database observability | PASS | `monitoring/database-observability-dashboard.json` |
| Before/after performance comparison | PASS | `reports/performance/performance-apdex-report.md` |
| Profiling evidence | PASS | `reports/performance/cloudrun-smoke.cpuprofile` |
| APDEX evidence | PASS | `reports/performance/performance-apdex-current.json`; APDEX 1.0 |
| Lighthouse evidence | READY AFTER WORKFLOW RUN | `.github/workflows/lighthouse.yml`, artifact `lighthouse-reports` |
| Clarity/usability evidence | PASS | `reports/usability/clarity-usability-evidence.md`, Selenium screenshots/artifacts |
| Design patterns documented | PASS | `docs/SOFTWARE_DESIGN.md` |
| Architecture documented | PASS | `docs/SOFTWARE_ARCHITECTURE.md` |
| Deployment strategy | PASS | Cloud Run revisions, rollback/canary commands in `docs/DEPLOYMENT_AND_MONITORING.md` |
| Security testing evidence | PASS | CodeQL, OSSF Scorecard, dependency review, npm audit 0 vulnerabilities |

## Estimated Grade After Push

| Category | Estimate |
| --- | ---: |
| Software Design | 3.8-4.0 |
| Software Quality | 3.8-4.0 |
| Software Architecture | 3.7-3.9 |
| Software Deployment | 3.8-4.0 |
| Progress Rubric | 3.9-4.0 |
| Individual Contribution | Depends on commit ownership, likely improved after these commits |

Current strict estimate: 3.85-3.95 / 4 once workflows are green.
