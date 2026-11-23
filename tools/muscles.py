#!/usr/bin/env python3
"""Draws the muscle-group reference illustrations and their manifest."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "muscles"
MANIFEST = ROOT / "src" / "lib" / "exercises" / "muscleImages.ts"

W, H = 420, 560
SS = 2
BASE = (38, 45, 54, 255)
BASE_LIGHT = (48, 56, 66, 255)
LIME = (212, 255, 0, 230)

MUSCLES = {
    "quadriceps": "front",
    "hamstrings": "back",
    "glutes": "back",
    "calves": "back",
    "soleus": "back",
    "tibialis": "front",
    "hip-flexors": "front",
    "adductors": "front",
    "abductors": "back",
    "core": "front",
    "obliques": "front",
    "back": "back",
    "shoulders": "front",
}


def capsule(draw, a, b, w1, w2, color):
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy) or 1
    nx, ny = -dy / length, dx / length
    draw.polygon(
        [
            (a[0] + nx * w1 / 2, a[1] + ny * w1 / 2),
            (b[0] + nx * w2 / 2, b[1] + ny * w2 / 2),
            (b[0] - nx * w2 / 2, b[1] - ny * w2 / 2),
            (a[0] - nx * w1 / 2, a[1] - ny * w1 / 2),
        ],
        fill=color,
    )
    for point, width in ((a, w1), (b, w2)):
        r = width / 2
        draw.ellipse([point[0] - r, point[1] - r, point[0] + r, point[1] + r], fill=color)


def body(draw, view):
    cx = W / 2
    # head and neck
    draw.ellipse([cx - 30, 26, cx + 30, 86], fill=BASE_LIGHT)
    capsule(draw, (cx, 84), (cx, 108), 26, 40, BASE)
    # torso
    torso = [(cx - 62, 108), (cx + 62, 108), (cx + 44, 268), (cx - 44, 268)]
    draw.polygon(torso, fill=BASE)
    draw.rounded_rectangle([cx - 44, 250, cx + 44, 300], radius=18, fill=BASE)
    # arms
    for side in (-1, 1):
        shoulder = (cx + side * 66, 120)
        elbow = (cx + side * 92, 210)
        wrist = (cx + side * 88, 296)
        capsule(draw, shoulder, elbow, 30, 24, BASE)
        capsule(draw, elbow, wrist, 24, 18, BASE)
        draw.ellipse([wrist[0] - 12, wrist[1] - 12, wrist[0] + 12, wrist[1] + 12], fill=BASE_LIGHT)
    # legs
    for side in (-1, 1):
        hip = (cx + side * 30, 296)
        knee = (cx + side * 38, 420)
        ankle = (cx + side * 36, 520)
        capsule(draw, hip, knee, 52, 34, BASE)
        capsule(draw, knee, ankle, 34, 22, BASE)
        draw.rounded_rectangle(
            [ankle[0] - 18, 520, ankle[0] + 18, 540], radius=8, fill=BASE_LIGHT
        )


def highlight(draw, view, muscle):
    cx = W / 2
    if muscle == "quadriceps":
        for side in (-1, 1):
            capsule(draw, (cx + side * 34, 320), (cx + side * 38, 408), 38, 26, LIME)
    elif muscle == "hamstrings":
        for side in (-1, 1):
            capsule(draw, (cx + side * 34, 318), (cx + side * 38, 406), 36, 24, LIME)
    elif muscle == "glutes":
        for side in (-1, 1):
            draw.ellipse([cx + side * 30 - 30, 262, cx + side * 30 + 30, 320], fill=LIME)
    elif muscle == "calves":
        for side in (-1, 1):
            capsule(draw, (cx + side * 38, 428), (cx + side * 36, 500), 32, 20, LIME)
    elif muscle == "soleus":
        for side in (-1, 1):
            capsule(draw, (cx + side * 38, 462), (cx + side * 36, 512), 28, 16, LIME)
    elif muscle == "tibialis":
        for side in (-1, 1):
            capsule(draw, (cx + side * 26, 430), (cx + side * 26, 508), 12, 8, LIME)
    elif muscle == "hip-flexors":
        for side in (-1, 1):
            draw.ellipse([cx + side * 22 - 16, 276, cx + side * 22 + 16, 310], fill=LIME)
    elif muscle == "adductors":
        for side in (-1, 1):
            capsule(draw, (cx + side * 12, 310), (cx + side * 20, 400), 16, 10, LIME)
    elif muscle == "abductors":
        for side in (-1, 1):
            draw.ellipse([cx + side * 52 - 18, 272, cx + side * 52 + 18, 318], fill=LIME)
    elif muscle == "core":
        draw.rounded_rectangle([cx - 34, 170, cx + 34, 252], radius=16, fill=LIME)
    elif muscle == "obliques":
        for side in (-1, 1):
            capsule(draw, (cx + side * 44, 162), (cx + side * 40, 252), 14, 12, LIME)
    elif muscle == "back":
        draw.rounded_rectangle([cx - 52, 120, cx + 52, 250], radius=20, fill=LIME)
    elif muscle == "shoulders":
        for side in (-1, 1):
            draw.ellipse([cx + side * 62 - 22, 104, cx + side * 62 + 22, 150], fill=LIME)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    entries = []
    for muscle, view in MUSCLES.items():
        image = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        body(draw, view)

        layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
        highlight(ImageDraw.Draw(layer), view, muscle)

        glow = layer.filter(ImageFilter.GaussianBlur(10 * SS))
        image.alpha_composite(glow)
        image.alpha_composite(layer)

        image = image.resize((W, H), Image.LANCZOS)
        image.save(OUT / f"{muscle}.png", optimize=True)
        entries.append(muscle)

    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "/** Generated by tools/muscles.py — reference body maps. */",
        "export const MUSCLE_IMAGES: Record<string, ImageSourcePropType> = {",
    ]
    for muscle in entries:
        lines.append(f"  '{muscle}': require('../../../assets/muscles/{muscle}.png'),")
    lines.append("};")
    lines.append("")
    MANIFEST.write_text("\n".join(lines))
    print(f"drew {len(entries)} muscle maps")


if __name__ == "__main__":
    main()
