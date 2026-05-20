from __future__ import annotations

import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from verifier.config import load_settings
from verifier.concurrency import ConcurrencyVerifier
from verifier.evidence import ArtifactManager
from verifier.services import build_services
from verifier.setup_helpers import SetupHelper


def main() -> int:
    settings = load_settings()
    services = build_services(settings)
    helper = SetupHelper(settings, services)
    artifacts = ArtifactManager(Path(settings.artifacts_root) / "concurrency")

    verifier = ConcurrencyVerifier(settings, services, helper, artifacts)
    outcomes = verifier.run_all()
    for outcome in outcomes:
        artifacts.record_scenario(
            f"concurrency_{outcome.name}",
            outcome.verdict,
            {
                "worker_count": outcome.worker_count,
                "before": outcome.before,
                "after": outcome.after,
                "result_counts": outcome.result_counts,
                "limitations": outcome.limitations,
            },
        )
    (artifacts.run_root / "outcomes.json").write_text(
        json.dumps([outcome.__dict__ for outcome in outcomes], indent=2, default=str),
        encoding="utf-8",
    )
    summary_path = artifacts.finalize()

    print(json.dumps([outcome.__dict__ for outcome in outcomes], indent=2, default=str))
    print(f"[verifier] Concurrency summary written to {summary_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
