# Performance, APDEX, Load, and Profiling Evidence

Generated: 2026-05-22T09:39:01.317Z

## Scope

This report measures the deployed Cloud Run frontend and every deployed service health endpoint. The "before" sample is the first cold/warm-up pass in the same run; the "after" sample is the steadier pass captured after warm-up. The comparison is meant to be reproducible evidence, not a claim of a specific code optimization.

## APDEX

- Threshold T: 500 ms
- Satisfied: 35
- Tolerating: 0
- Frustrated: 0
- Score: 1

## Before/After Latency

| Target | Before avg ms | After avg ms | After p95 ms | After availability | Delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| Frontend home | 297.13 | 237.8 | 242.15 | 1 | -59.33 ms |
| Frontend status | 254.6 | 235.13 | 236.92 | 1 | -19.47 ms |
| Auth/Profile health | 259.64 | 242.57 | 246.24 | 1 | -17.07 ms |
| Inventory health | 257.35 | 241.76 | 243.55 | 1 | -15.59 ms |
| Wallet health | 260.41 | 240.79 | 244.67 | 1 | -19.62 ms |
| Order health | 259.85 | 243.68 | 250.49 | 1 | -16.17 ms |
| Voucher health | 266.19 | 242.6 | 244.86 | 1 | -23.59 ms |

## Load Smoke

- Requests: 20
- Concurrency: 4
- Availability: 1
- p95 latency: 246.34 ms

## Profiling Artifact

CPU profile: `reports/performance/cloudrun-smoke.cpuprofile`

Raw JSON: `reports/performance/performance-apdex-current.json`
