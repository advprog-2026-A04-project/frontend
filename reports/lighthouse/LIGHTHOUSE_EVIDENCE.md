# Lighthouse Evidence

The repository contains an executable Lighthouse CI workflow at `.github/workflows/lighthouse.yml`.

Evidence path after a workflow run:

- GitHub Actions artifact: `lighthouse-reports`
- Local workflow output directory: `.lighthouseci/`
- URLs checked:
  - `https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app/`

Run command for local/manual verification:

```bash
npx @lhci/cli autorun --collect.url=https://advprog-frontend-m25-m50-osvihgaoya-uc.a.run.app/
```

This file is an evidence index. The raw Lighthouse JSON/HTML reports are produced by the workflow artifact so the browser dependency does not need to be committed to the repository.
