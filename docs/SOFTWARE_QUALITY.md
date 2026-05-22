# Software Quality

## Tooling

| Area | Tools |
|---|---|
| Backend tests | Gradle, JUnit, Spring Boot test, JaCoCo |
| Static analysis | PMD, Checkstyle, CodeQL, OSSF Scorecard or dependency review where configured |
| Frontend tests | Vitest, Testing Library, ESLint, Vite build |
| Functional tests | Selenium browser verifier with pytest, screenshots, JSON summaries, optional HTML report |
| Security | GitHub OIDC for Cloud Run deploy, runtime-only admin token, role/authorization Selenium checks |

## Verified Local Results

| Component | Command | Result |
|---|---|---|
| Auth/Profile | `./gradlew.bat check bootJar` | Passed |
| Inventory | `./gradlew.bat check bootJar` | Passed |
| Order | `./gradlew.bat check bootJar` | Passed |
| Wallet | `./gradlew.bat check bootJar` | Passed |
| Voucher/Promo | `./gradlew.bat check :backend:bootJar` | Passed |
| Frontend | `npm run lint; npm run test; npm run build` | Passed |
| Selenium verifier | `python -m pytest tests/test_live_verification.py -q --html=../../verification-artifacts/live-report-final-32.html --self-contained-html` | 32 passed against Cloud Run |

## Coverage

| Component | Line coverage | Branch coverage | Status |
|---|---:|---:|---|
| Auth/Profile | 100% | 96.05% | PASS |
| Inventory | 100% | 98.28% | PASS |
| Order | 95.48% | 90.09% | PASS |
| Wallet | 98.65% | 98.39% | PASS |
| Voucher/Promo | 100% | 94.44% | PASS |
| Frontend unit tests | 39.73% | 38.76% | PARTIAL |

Frontend unit coverage is not presented as 90%+. The frontend grading evidence is the combination of lint/build/unit tests plus 32 Selenium scenarios that exercise the deployed UI and backend integration.

## Selenium Scenarios

The verifier currently runs 32 browser scenarios. Final deployed run: `32 passed in 408.58s`, report `verification-artifacts/live-report-final-32.html`. Scenarios include:

- login, register, logout, and invalid login
- profile load/update and role navigation
- catalog browse, aliases, search, filter, and empty state
- protected-route validation for guest users
- checkout, insufficient balance rejection, duplicate-submit regression
- wallet top-up request, admin-backed approval evidence, history, and payment/refund visibility
- voucher validation, public voucher UI, admin token negative case, admin voucher management
- order lifecycle, invalid transitions, rating, cancellation, admin monitoring
- deployed health/environment sanity

Run commands are documented in `verification/selenium-verifier/README.md`.

## Remaining Quality Risks

| Risk | Status |
|---|---|
| Frontend unit coverage below 90% | Accepted partial; Selenium covers user-facing integration. |
| Public Selenium report retention | Manual GitHub Actions workflow uploads `live-selenium-artifacts`; retention follows GitHub Actions artifact policy. |
| Cross-service error format consistency | Still uneven and should be standardized after grading. |
| Database migrations | Voucher has stronger migration/provisioning evidence; other services need Flyway/Liquibase hardening. |
