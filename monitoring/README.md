# Monitoring Evidence

This directory contains importable Google Cloud Monitoring dashboard definitions for the deployed A04 system.

- `cloud-run-dashboard.json` tracks Cloud Run request volume, p95 latency, 5xx rate, and CPU utilization across the frontend and backend services.
- `database-observability-dashboard.json` tracks Cloud SQL CPU, open PostgreSQL backends, disk utilization, and transaction rate.

Import command:

```bash
gcloud monitoring dashboards create --config-from-file=monitoring/cloud-run-dashboard.json
gcloud monitoring dashboards create --config-from-file=monitoring/database-observability-dashboard.json
```

Related live health endpoints are measured by `npm run perf:evidence`, which writes APDEX, load-smoke, and CPU profiling evidence under `reports/performance/`.
