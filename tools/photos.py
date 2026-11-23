#!/usr/bin/env python3
"""Downloads the public-domain exercise photos used beside the illustrations.

Source: free-exercise-db (https://github.com/yuhonas/free-exercise-db), released
under The Unlicense (public domain). Only exercises whose dataset entry shows the
same movement are mapped; everything else keeps its drawn movement guide.

The JSON index is fetched at build time. The app itself only reads the bundled
JPEGs written by this script, so it stays fully offline.
"""

from __future__ import annotations

import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "src" / "lib" / "exercises"
ASSETS = ROOT / "assets" / "exercises"
MANIFEST = ROOT / "tools" / "photo-sources.json"
INDEX_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
CACHE = Path("/tmp/fedb.json")

# exercise id -> free-exercise-db entry that demonstrates the same movement
MAPPING: dict[str, str] = {
    "goblet-squat": "Goblet Squat",
    "bodyweight-squat": "Bodyweight Squat",
    "walking-lunges": "Bodyweight Walking Lunge",
    "forward-lunge": "Dumbbell Lunges",
    "reverse-lunges": "Dumbbell Rear Lunge",
    "dumbbell-rdl": "Romanian Deadlift",
    "single-leg-rdl": "Kettlebell One-Legged Deadlift",
    "step-ups": "Step-up with Knee Raise",
    "weighted-step-ups": "Dumbbell Step Ups",
    "glute-bridge": "Butt Lift (Bridge)",
    "single-leg-glute-bridge": "Single Leg Glute Bridge",
    "hip-thrust": "Barbell Hip Thrust",
    "standing-calf-raises": "Standing Calf Raises",
    "seated-calf-raises": "Barbell Seated Calf Raise",
    "plank": "Plank",
    "side-plank": "Side Bridge",
    "dead-bug": "Dead Bug",
    "reverse-crunch": "Reverse Crunch",
    "mountain-climbers": "Mountain Climbers",
    "pallof-press": "Pallof Press",
    "russian-twists": "Russian Twist",
    "superman-hold": "Superman",
    "monster-walks": "Monster Walk",
    "standing-hip-extensions": "Hip Extension with Bands",
    "farmers-carry": "Farmer's Walk",
    "standing-calf-stretch": "Calf Stretch Hands Against Wall",
    "hamstring-stretch": "Hamstring Stretch",
    "hip-flexor-stretch": "Kneeling Hip Flexor",
    "standing-quad-stretch": "Standing Elevated Quad Stretch",
    "childs-pose": "Child's Pose",
    "adductor-stretch": "Adductor",
    "worlds-greatest-stretch": "World's Greatest Stretch",
    "arm-circles": "Arm Circles",
    "ankle-circles": "Ankle Circles",
    "carioca": "Carioca Quick Step",
    "wall-running-drill": "Linear Acceleration Wall Drill",
    "foam-roll-calves": "Calves-SMR",
    "foam-roll-hamstrings": "Hamstring-SMR",
    "foam-roll-quads": "Quadriceps-SMR",
}

SKIP = {"types.ts", "index.ts", "routines.ts", "exerciseImages.ts", "muscles.ts", "categories.ts", "muscleImages.ts"}


def category_of(exercise_id: str) -> str:
    for path in sorted(LIB.glob("*.ts")):
        if path.name in SKIP:
            continue
        text = path.read_text()
        for match in re.finditer(r"id: '([a-z0-9-]+)'", text):
            if match.group(1) != exercise_id:
                continue
            tail = text[match.end(): match.end() + 400]
            cats = re.search(r"categories: \[([^\]]*)\]", tail)
            if cats:
                return cats.group(1).split(",")[0].strip().strip("'")
    return "misc"


def load_index() -> list[dict]:
    if CACHE.exists():
        return json.loads(CACHE.read_text())
    request = urllib.request.Request(INDEX_URL, headers={"User-Agent": "RunPlanBot/1.0"})
    data = urllib.request.urlopen(request, timeout=60).read()
    CACHE.write_bytes(data)
    return json.loads(data)


def download(url: str) -> Image.Image:
    request = urllib.request.Request(url, headers={"User-Agent": "RunPlanBot/1.0"})
    raw = urllib.request.urlopen(request, timeout=60).read()
    return Image.open(io.BytesIO(raw)).convert("RGB")


def square(image: Image.Image, size: int = 640) -> Image.Image:
    w, h = image.size
    side = min(w, h)
    image = image.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    return image.resize((size, size), Image.LANCZOS)


def main() -> int:
    index = load_index()
    by_name = {entry["name"]: entry for entry in index}
    missing_names = [name for name in MAPPING.values() if name not in by_name]
    if missing_names:
        print("Unknown dataset entries:", missing_names)
        return 1

    sources = {}
    downloaded = 0
    for exercise_id, name in MAPPING.items():
        entry = by_name[name]
        folder = ASSETS / category_of(exercise_id)
        folder.mkdir(parents=True, exist_ok=True)
        files = []
        for i, rel in enumerate(entry.get("images", [])[:2], start=1):
            url = IMAGE_BASE + rel
            image = square(download(url))
            target = folder / f"{exercise_id}-photo-{i}.jpg"
            image.save(target, "JPEG", quality=84, optimize=True, progressive=True)
            files.append(target.relative_to(ROOT).as_posix())
            downloaded += 1
        sources[exercise_id] = {
            "dataset": name,
            "license": "Unlicense (public domain)",
            "source": "https://github.com/yuhonas/free-exercise-db",
            "files": files,
        }
        print(f"{exercise_id:28s} <- {name}")

    MANIFEST.write_text(json.dumps(sources, indent=2) + "\n")
    print(f"\n{len(MAPPING)} exercises, {downloaded} photos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
