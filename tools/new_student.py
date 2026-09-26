"""Create empty, isolated student state; never copy another learner's evidence."""
import argparse
import json
import re
from datetime import date
from pathlib import Path


def create_profile(root: Path, profile_id: str) -> Path:
    if not re.fullmatch(r"[a-z][a-z0-9_-]{0,39}", profile_id):
        raise ValueError("Use 1–40 lowercase letters, digits, underscores or hyphens, starting with a letter.")
    if profile_id in {"con", "prn", "aux", "nul", *(f"com{i}" for i in range(10)), *(f"lpt{i}" for i in range(10))}:
        raise ValueError("Reserved Windows name.")
    target = root / "students" / profile_id
    target.mkdir(parents=True, exist_ok=False)
    for name in ("student", "diagnostic", "curriculum"):
        (target / name).mkdir()
    today = date.today().isoformat()
    records = {
        "student/skill_map.json": {"schema_version": 1, "updated_on": today, "skills": {}, "assessment": {"status": "not_started"}},
        "student/mastery.json": {"schema_version": 1, "updated_on": today, "scale": {"0": "Unknown", "1": "Exposure only", "2": "Weak", "3": "Functional", "4": "Strong", "5": "Mastered"}, "skills": {}},
        "student/review_queue.json": {"schema_version": 1, "updated_on": today, "items": [], "completed_reviews": []},
        "student/lesson_progress.json": {"schema_version": 1, "lessons": {}, "pending_item": None},
    }
    for name, data in records.items():
        (target / name).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    texts = {
        "student/learning_profile.md": "# Learning profile\n\nGoals and preferences not yet established. No performance evidence.\n",
        "student/mistakes.md": "# Mistake patterns\n\nNo observations yet.\n",
        "student/session_history.md": "# Session history\n\nSubstantive sessions completed: 0. Profile initialized; no assessment yet.\n",
        "diagnostic/diagnostic_results.md": "# Diagnostic results\n\nNot started. No inherited evidence.\n",
        "curriculum/roadmap.md": "# Personalized roadmap\n\nDeferred until this learner's assessment. Shared catalog: ../../../curriculum/framework.md.\n",
        "curriculum/current_plan.md": "# Current plan\n\nEstablish goals and begin an adaptive diagnostic, one question at a time. Keep assessment separate from teaching. Use the shared lesson policy after placement.\n",
    }
    for name, content in texts.items():
        (target / name).write_text(content, encoding="utf-8")
    return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile_id")
    args = parser.parse_args()
    print(create_profile(Path(__file__).resolve().parents[1], args.profile_id))
