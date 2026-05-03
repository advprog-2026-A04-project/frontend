from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, Path):
        return str(value)
    if is_dataclass(value):
        return asdict(value)
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except TypeError:
            pass
    return repr(value)


class ScenarioArtifacts:
    def __init__(self, path: Path, name: str) -> None:
        self.path = path
        self.name = name
        self.path.mkdir(parents=True, exist_ok=True)

    def write_json(self, filename: str, payload: Any) -> Path:
        target = self.path / filename
        target.write_text(json.dumps(payload, indent=2, default=_json_default), encoding="utf-8")
        return target

    def write_text(self, filename: str, text: str) -> Path:
        target = self.path / filename
        target.write_text(text, encoding="utf-8")
        return target

    def save_screenshot(self, filename: str, driver) -> Path:
        target = self.path / filename
        driver.save_screenshot(str(target))
        return target


class ArtifactManager:
    def __init__(self, root: Path) -> None:
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        self.run_root = root / timestamp
        self.run_root.mkdir(parents=True, exist_ok=True)
        self.summary: dict[str, Any] = {
            "run_root": str(self.run_root),
            "started_at": datetime.now().isoformat(),
            "scenarios": {},
            "notes": [],
        }

    def scenario(self, name: str) -> ScenarioArtifacts:
        safe_name = name.replace(" ", "_")
        return ScenarioArtifacts(self.run_root / safe_name, name)

    def record_scenario(self, name: str, verdict: str, details: dict[str, Any]) -> None:
        self.summary["scenarios"][name] = {
            "verdict": verdict,
            **details,
        }

    def add_note(self, note: str) -> None:
        self.summary["notes"].append(note)

    def finalize(self) -> Path:
        self.summary["finished_at"] = datetime.now().isoformat()
        target = self.run_root / "summary.json"
        target.write_text(json.dumps(self.summary, indent=2, default=_json_default), encoding="utf-8")
        return target
