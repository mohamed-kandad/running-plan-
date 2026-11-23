#!/usr/bin/env python3
"""Renders the bundled exercise illustrations and their TypeScript manifest.

Every exercise gets one to three 640x640 PNG frames drawn from a shared
parametric figure, so the whole library keeps the same proportions and look.
A pose is a handful of angles; the families in art.py keep related exercises
consistent.

Usage:
    python3 tools/illustrate.py            # render every exercise in art.py
    python3 tools/illustrate.py --sheet    # also write a contact sheet
"""

from __future__ import annotations

import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import art  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "exercises"
MANIFEST = ROOT / "src" / "lib" / "exercises" / "exerciseImages.ts"

W = H = 640
SS = 2
FLOOR = art.FLOOR

BODY = (235, 231, 219, 255)
BODY_FAR = (150, 156, 158, 150)
SHOE = (212, 255, 0, 255)
SHOE_FAR = (150, 180, 70, 150)
INK = (12, 14, 17, 255)
PROP = (58, 66, 76, 255)
PROP_SOFT = (40, 46, 54, 255)
PROP_LINE = (120, 132, 146, 255)
LIME = (212, 255, 0, 255)
FLOOR_COL = (38, 43, 50, 255)
SHADOW = (0, 0, 0, 70)

L = dict(torso=150, neck=40, head=26, thigh=92, shin=88, foot=36, upper=70, fore=62)


def rad(deg):
    return math.radians(deg)


def step(point, angle, length):
    return (point[0] + length * math.sin(rad(angle)), point[1] + length * math.cos(rad(angle)))


def mid(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def solve(p):
    hip = (p["px"], p["py"])
    shoulder = step(hip, p["torso"], L["torso"])
    neck_top = step(shoulder, p["neck"], L["neck"])
    head_c = step(neck_top, p["neck"], L["head"])

    t, s, f = p["leg"]
    knee = step(hip, t, L["thigh"])
    ankle = step(knee, s, L["shin"])
    toe = step(ankle, f, L["foot"])

    t2, s2, f2 = p["leg2"] if p["leg2"] else (t - 7, s - 4, f + 2)
    knee2 = step(hip, t2, L["thigh"])
    ankle2 = step(knee2, s2, L["shin"])
    toe2 = step(ankle2, f2, L["foot"])

    u, e = p["arm"]
    elbow = step(shoulder, u, L["upper"])
    wrist = step(elbow, e, L["fore"])

    u2, e2 = p["arm2"] if p["arm2"] else (u - 12, e - 8)
    elbow2 = step(shoulder, u2, L["upper"])
    wrist2 = step(elbow2, e2, L["fore"])

    return dict(
        hip=hip, shoulder=shoulder, neck=neck_top, head=head_c,
        chest=mid(hip, shoulder),
        knee=knee, ankle=ankle, toe=toe,
        knee2=knee2, ankle2=ankle2, toe2=toe2,
        elbow=elbow, wrist=wrist,
        elbow2=elbow2, wrist2=wrist2,
    )


def capsule(draw, a, b, w1, w2, color):
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy) or 1
    nx, ny = -dy / length, dx / length
    pts = [
        (a[0] + nx * w1 / 2, a[1] + ny * w1 / 2),
        (b[0] + nx * w2 / 2, b[1] + ny * w2 / 2),
        (b[0] - nx * w2 / 2, b[1] - ny * w2 / 2),
        (a[0] - nx * w1 / 2, a[1] - ny * w1 / 2),
    ]
    draw.polygon(pts, fill=color)
    for point, width in ((a, w1), (b, w2)):
        r = width / 2
        draw.ellipse([point[0] - r, point[1] - r, point[0] + r, point[1] + r], fill=color)


def limb(draw, a, b, width, color, outline=False):
    capsule(draw, a, b, width, width, color)


def torso_shape(draw, hip, shoulder, hip_w, sho_w, color):
    capsule(draw, hip, shoulder, hip_w, sho_w, color)


def head(draw, center, radius, color):
    draw.ellipse([center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius], fill=color)


def shoe(draw, ankle, toe, color, width=19):
    capsule(draw, ankle, toe, width, width - 5, color)


def arrow(draw, start, end, color=LIME, width=6):
    if math.dist(start, end) < 20:
        return
    draw.line([start, end], fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    size = 20
    left = (end[0] - size * math.cos(angle - 0.5), end[1] - size * math.sin(angle - 0.5))
    right = (end[0] - size * math.cos(angle + 0.5), end[1] - size * math.sin(angle + 0.5))
    draw.polygon([end, left, right], fill=color)


def floor(draw):
    draw.line([(28, FLOOR), (W - 28, FLOOR)], fill=FLOOR_COL, width=4)


def shadow(draw, x, y, w=120):
    draw.ellipse([x - w / 2, y - 8, x + w / 2, y + 10], fill=SHADOW)


def prop(draw, item, joints, layer="back"):
    front_kinds = {"kettlebell", "dumbbell", "band", "towel"}
    natural = "front" if item["kind"] in front_kinds else "back"
    if item.get("layer", natural) != layer:
        return
    kind = item["kind"]
    if kind == "box":
        x, w, h = item["x"], item["w"], item["h"]
        draw.rounded_rectangle([x - w / 2, FLOOR - h, x + w / 2, FLOOR], radius=8,
                               fill=PROP_SOFT, outline=PROP_LINE, width=3)
    elif kind == "wall":
        x = item["x"]
        draw.rectangle([x - 10, 60, x + 10, FLOOR], fill=PROP_SOFT)
        draw.line([(x, 60), (x, FLOOR)], fill=PROP_LINE, width=3)
    elif kind == "mat":
        draw.rounded_rectangle([item["x"], FLOOR - 6, item["x"] + item["w"], FLOOR + 10],
                               radius=8, fill=PROP_SOFT)
    elif kind == "chair":
        x = item["x"]
        draw.line([(x, FLOOR), (x, FLOOR - 150)], fill=PROP_LINE, width=8)
        draw.line([(x, FLOOR - 150), (x + 130, FLOOR - 150)], fill=PROP_LINE, width=8)
        draw.line([(x + 130, FLOOR - 150), (x + 130, FLOOR)], fill=PROP_LINE, width=8)
    elif kind == "stairs":
        for i in range(4):
            x = 380 + i * 54
            draw.rectangle([x, FLOOR - 28 * (i + 1), x + 54, FLOOR], fill=PROP_SOFT,
                           outline=PROP_LINE, width=2)
    elif kind == "band":
        a = joints.get(item.get("a", "ankle"))
        b = joints.get(item.get("b", "ankle2"))
        if a and b:
            draw.line([a, b], fill=(255, 140, 60, 230), width=6)
    elif kind == "dumbbell":
        at = joints.get(item.get("at", "wrist"))
        if at:
            draw.line([(at[0] - 22, at[1]), (at[0] + 22, at[1])], fill=PROP_LINE, width=5)
            for dx in (-26, 26):
                draw.rounded_rectangle([at[0] + dx - 9, at[1] - 16, at[0] + dx + 9, at[1] + 16],
                                       radius=5, fill=PROP)
            draw.ellipse([at[0] - 9, at[1] - 9, at[0] + 9, at[1] + 9], fill=BODY)
    elif kind == "kettlebell":
        at = joints.get(item.get("at", "chest"))
        if at:
            draw.arc([at[0] - 26, at[1] - 52, at[0] + 26, at[1] - 4], 200, 340, fill=PROP_LINE, width=7)
            draw.ellipse([at[0] - 24, at[1] - 12, at[0] + 24, at[1] + 38], fill=PROP)
    elif kind == "roller":
        at = joints.get(item.get("at", "hip"))
        if at:
            draw.rounded_rectangle([at[0] - 74, at[1] + 10, at[0] + 74, at[1] + 46], radius=18, fill=PROP)
    elif kind == "towel":
        at = joints.get(item.get("at", "toe"))
        if at:
            draw.rounded_rectangle([at[0] - 38, FLOOR - 12, at[0] + 38, FLOOR], radius=4,
                                   fill=(206, 200, 180, 255))


def draw_pose(p):
    img = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    j = solve(p)
    joints = {key: (value[0] * SS, value[1] * SS) for key, value in j.items()}

    floor(draw)
    shadow(draw, j["hip"][0], FLOOR + 2, 150)

    for item in p["props"]:
        prop(draw, item, joints, "back")

    far = BODY_FAR
    capsule(draw, joints["hip"], joints["knee2"], 30 * SS, 22 * SS, far)
    capsule(draw, joints["knee2"], joints["ankle2"], 22 * SS, 14 * SS, far)
    if p["shoe"]:
        shoe(draw, joints["ankle2"], joints["toe2"], SHOE_FAR)
    capsule(draw, joints["shoulder"], joints["elbow2"], 20 * SS, 16 * SS, far)
    capsule(draw, joints["elbow2"], joints["wrist2"], 16 * SS, 12 * SS, far)

    torso_shape(draw, joints["hip"], joints["shoulder"], p["hip_w"] * SS, 54 * SS, BODY)
    hip_r = 24 * SS
    draw.ellipse([joints["hip"][0] - hip_r, joints["hip"][1] - hip_r * 0.72,
                  joints["hip"][0] + hip_r, joints["hip"][1] + hip_r * 0.72], fill=BODY)
    sho_r = 26 * SS
    draw.ellipse([joints["shoulder"][0] - sho_r, joints["shoulder"][1] - sho_r * 0.8,
                  joints["shoulder"][0] + sho_r, joints["shoulder"][1] + sho_r * 0.8], fill=BODY)
    capsule(draw, joints["shoulder"], joints["neck"], 24 * SS, 16 * SS, BODY)

    capsule(draw, joints["hip"], joints["knee"], 32 * SS, 23 * SS, BODY)
    capsule(draw, joints["knee"], joints["ankle"], 23 * SS, 14 * SS, BODY)
    if p["shoe"]:
        shoe(draw, joints["ankle"], joints["toe"], SHOE)

    capsule(draw, joints["shoulder"], joints["elbow"], 21 * SS, 16 * SS, BODY)
    capsule(draw, joints["elbow"], joints["wrist"], 16 * SS, 12 * SS, BODY)

    head(draw, joints["head"], 20 * SS, BODY)

    for item in p["props"]:
        prop(draw, item, joints, "front")

    return img.resize((W, H), Image.LANCZOS)


def draw_arrow(img, p1, p2, joint):
    draw = ImageDraw.Draw(img)
    j1 = {key: (value[0] * SS, value[1] * SS) for key, value in solve(p1).items()}
    j2 = {key: (value[0] * SS, value[1] * SS) for key, value in solve(p2).items()}
    if joint not in j1 or joint not in j2:
        return
    arrow(draw, j1[joint], j2[joint])


# --------------------------------------------------------------------------- #
# Category folders come from the TypeScript records.
# --------------------------------------------------------------------------- #
def primary_categories():
    mapping = {}
    for path in sorted((ROOT / "src" / "lib" / "exercises").glob("*.ts")):
        if path.name in ("types.ts", "index.ts", "routines.ts", "exerciseImages.ts",
                         "muscles.ts", "categories.ts"):
            continue
        text = path.read_text()
        for match in re.finditer(r"id: '([a-z0-9-]+)'", text):
            ex_id = match.group(1)
            tail = text[match.end(): match.end() + 400]
            cats = re.search(r"categories: \[([^\]]*)\]", tail)
            if cats and ex_id not in mapping:
                first = cats.group(1).split(",")[0].strip().strip("'")
                mapping[ex_id] = first
    return mapping


def main():
    categories = primary_categories()
    OUT.mkdir(parents=True, exist_ok=True)

    entries = []
    missing_art = []
    for ex_id, spec in art.EXERCISES.items():
        frames = spec["frames"]
        category = categories.get(ex_id, "misc")
        folder = OUT / category
        folder.mkdir(parents=True, exist_ok=True)

        images = []
        for photo_index, photo in enumerate(sorted(folder.glob(f"{ex_id}-photo-*.jpg"))):
            images.append((category, photo.name, "Photo" if photo_index == 0 else "Photo · End"))

        for index, pose in enumerate(frames, start=1):
            image = draw_pose(pose)
            if index == 1 and len(frames) > 1 and spec.get("arrow"):
                draw_arrow(image, frames[0], frames[-1], spec["arrow"])
                image = image.resize((W, H), Image.LANCZOS)
            path = folder / f"{ex_id}-{index}.png"
            image.save(path, optimize=True)
            if len(frames) == 1:
                label = "Illustration"
            elif index == 1:
                label = "Illustration"
            elif index == len(frames):
                label = "Illustration · End"
            else:
                label = "Illustration · Mid"
            images.append((category, path.name, label))

        entries.append((ex_id, images))

    # Every exercise in the records must have art.
    all_ids = set()
    for path in sorted((ROOT / "src" / "lib" / "exercises").glob("*.ts")):
        if path.name in ("types.ts", "index.ts", "routines.ts", "exerciseImages.ts",
                         "muscles.ts", "categories.ts"):
            continue
        all_ids.update(re.findall(r"\n    id: '([a-z0-9-]+)'", path.read_text()))
    missing_art = sorted(all_ids - set(art.EXERCISES))

    lines = [
        "import type { ExerciseImage } from './types';",
        "",
        "/** Generated by tools/illustrate.py — every exercise's bundled frames. */",
        "export const EXERCISE_IMAGES: Record<string, ExerciseImage[]> = {",
    ]
    for ex_id, images in entries:
        lines.append(f"  '{ex_id}': [")
        for category, filename, label in images:
            lines.append(
                f"    {{ source: require('../../../assets/exercises/{category}/{filename}'), label: '{label}' }},"
            )
        lines.append("  ],")
    lines.append("};")
    lines.append("")
    MANIFEST.write_text("\n".join(lines))

    print(f"rendered {sum(len(i) for _, i in entries)} frames for {len(entries)} exercises")
    if missing_art:
        print("MISSING ART:", ", ".join(missing_art))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
