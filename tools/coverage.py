#!/usr/bin/env python3
"""Image coverage report for the exercise library.

Checks every exercise record against its bundled frames and the generated
manifest, so the summary can state real numbers instead of assumptions.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "src" / "lib" / "exercises"
ASSETS = ROOT / "assets" / "exercises"
MANIFEST = LIB / "exerciseImages.ts"
MUSCLE_MANIFEST = LIB / "muscleImages.ts"
MUSCLES = ROOT / "assets" / "muscles"

SKIP = {"types.ts", "index.ts", "routines.ts", "exerciseImages.ts", "muscles.ts", "categories.ts", "muscleImages.ts"}


def main() -> int:
    ids: list[str] = []
    per_category: dict[str, int] = {}
    for path in sorted(LIB.glob("*.ts")):
        if path.name in SKIP:
            continue
        text = path.read_text()
        per_category[path.stem] = len(re.findall(r"\n    id: '([a-z0-9-]+)'", text))
        ids.extend(re.findall(r"\n    id: '([a-z0-9-]+)'", text))

    manifest_text = MANIFEST.read_text() if MANIFEST.exists() else ""
    manifest_paths = re.findall(r"require\('([^']+)'\)", manifest_text)
    manifest_ids = set(re.findall(r"^  '([a-z0-9-]+)': \[", manifest_text, re.M))

    frames: dict[str, list[Path]] = {}
    for png in ASSETS.rglob("*.png"):
        match = re.match(r"(.+)-(\d+)$", png.stem)
        if match:
            frames.setdefault(match.group(1), []).append(png)

    missing = [ex for ex in ids if len(frames.get(ex, [])) == 0]
    multi = [ex for ex in ids if len(frames.get(ex, [])) > 1]
    invalid = [p for p in manifest_paths if not (MANIFEST.parent / p).exists()]
    total_frames = sum(len(v) for v in frames.values())
    photos = list(ASSETS.rglob("*-photo-*.jpg"))
    photo_ids = {re.match(r"(.+)-photo-\d+$", p.stem).group(1) for p in photos if re.match(r"(.+)-photo-\d+$", p.stem)}
    photo_bytes = sum(p.stat().st_size for p in photos)
    total_bytes = sum(p.stat().st_size for p in ASSETS.rglob("*.png"))

    routines_text = (LIB / "routines.ts").read_text()
    routines = re.findall(r"\n    id: '([a-z0-9-]+)'", routines_text)

    categories = re.findall(r"\n    id: '([a-z0-9-]+)'", (LIB / "categories.ts").read_text())
    muscle_ids = re.findall(r"\n    id: '([a-z-]+)'", (LIB / "muscles.ts").read_text())
    muscle_images = sorted(p.stem for p in MUSCLES.glob("*.png"))

    print("# Exercise library — image coverage report\n")
    print(f"- Exercises: **{len(ids)}**")
    print(f"- Categories: **{len(categories)}**")
    print(f"- Routines: **{len(routines)}**")
    print(f"- Muscle groups: **{len(muscle_ids)}** (maps drawn: {len(muscle_images)})")
    print(f"- Bundled illustration frames: **{total_frames}** ({total_bytes / 1024 / 1024:.1f} MB)")
    print(f"- Real photos: **{len(photos)}** across **{len(photo_ids)}** exercises ({photo_bytes / 1024 / 1024:.1f} MB)")
    print(f"- Exercises with a real photo: **{len(photo_ids)} / {len(ids)}**")
    print(f"- Exercises illustration-only: **{len(ids) - len(photo_ids)}**")
    print(f"- Exercises with >= 1 image: **{len(ids) - len(missing)} / {len(ids)}**")
    print(f"- Exercises with multiple frames: **{len(multi)}**")
    print(f"- Missing images: **{len(missing)}**" + (f" → {', '.join(missing)}" if missing else ""))
    print(f"- Invalid manifest paths: **{len(invalid)}**" + (f" → {invalid[0]}" if invalid else ""))
    print(f"- Manifest entries: **{len(manifest_ids)}**")
    unknown = sorted(manifest_ids - set(ids))
    if unknown:
        print(f"- Manifest ids with no record: **{len(unknown)}** → {', '.join(unknown)}")
    print("\n## Exercises per file / primary category\n")
    for name, count in per_category.items():
        print(f"- {name}: {count}")
    return 0 if not missing and not invalid else 1


if __name__ == "__main__":
    raise SystemExit(main())
