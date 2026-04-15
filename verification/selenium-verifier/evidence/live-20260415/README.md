## Live Evidence Bundle

This folder contains a curated artifact set from the most reliable live verification run against the deployed system on `2026-04-15`.

What is included:
- `run-summary.json`: combined verdicts for health, session, successful checkout, failed checkout, and voucher validation
- `successful-checkout/`: before and after state snapshots plus persisted order detail
- `failed-checkout/`: before and after state snapshots plus the direct insufficient-wallet API failure payload
- `concurrency/`: live service-level concurrency summaries for Inventory, Wallet, and Voucher using `25` workers
- `screenshots/`: representative UI evidence for successful and failed checkout flows

What is intentionally omitted:
- the full raw artifact dump from the local workspace run
- temporary auth files and browser cache data
- duplicate API payloads that do not add audit value beyond the retained summary and state snapshots

This bundle is meant to be human-reviewable evidence, not a replacement for rerunning the verifier.
