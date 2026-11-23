#!/usr/bin/env python3
"""Pose data for every exercise illustration.

A pose is a handful of angles and a pelvis position; helpers below describe the
families of movement (squat, hinge, bridge, ...) so related exercises share
proportions. Each entry returns one to three frames.
"""

from __future__ import annotations

FLOOR = 566
BASE_PY = 386  # pelvis height when standing with straight legs


def P(**kw):
    base = dict(px=320.0, py=float(BASE_PY), torso=180.0, neck=180.0,
                leg=(0.0, 0.0, 90.0), arm=(10.0, 6.0),
                leg2=None, arm2=None, far=True, props=[], view="side",
                hip_w=30.0, shoe=True)
    base.update(kw)
    return base


def stand(**kw):
    return P(**kw)


# --------------------------------------------------------------------------- #
# Strength families
# --------------------------------------------------------------------------- #
def squat(t, load=None, px=320.0):
    py = BASE_PY + 76 * t
    thigh = 80 * t
    return P(px=px, py=py, torso=180 - 16 * t, neck=176 - 6 * t,
             leg=(thigh, 2 * t, 90), leg2=(thigh - 4 * t, 6 * t, 94),
             arm=(50, 138) if load else (75, 88),
             props=[{"kind": "kettlebell", "at": "chest"}] if load == "kettlebell" else
                   ([{"kind": "dumbbell", "at": "wrist"}] if load == "dumbbell" else []))


def lunge(t, back=False, load=False):
    py = BASE_PY + 62 * t
    if back:
        return P(py=py, torso=176 - 10 * t, leg=(60 * t, -8 * t, 90),
                 leg2=(-38 * t, -66 * t, 120), arm=(20 + 40 * t, 40 + 50 * t))
    return P(py=py, torso=176 - 8 * t, leg=(-42 * t, -70 * t, 118),
             leg2=(58 * t, -6 * t, 90), arm=(18, 24))


def split_squat(t):
    return P(py=BASE_PY + 54 * t, torso=180 - 12 * t,
             leg=(62 * t, -4 * t, 90), leg2=(-30 * t, -58 * t, 110),
             props=[{"kind": "box", "x": 150, "w": 150, "h": 90}])


def step(t, down=False):
    py = BASE_PY - (36 if not down else 0) + (0 if not down else 0)
    if down:
        py = BASE_PY + 30 * t
        leg = (40 * t, -6 * t, 90)
        leg2 = (10 * t, -4 * t, 96)
    else:
        py = BASE_PY - 44 * t
        leg = (55 * t, -4 * t, 90)
        leg2 = (0, 20 * t, 110)
    return P(py=py, leg=leg, leg2=leg2, torso=178 - 8 * t,
             props=[{"kind": "box", "x": 360, "w": 170, "h": 70}])


def hinge(t, single=False, load=False):
    py = BASE_PY + 26 * t
    leg2 = None if single else (6 * t, 4 * t, 92)
    props = [{"kind": "dumbbell", "at": "wrist"}] if load else []
    return P(py=py, torso=180 + 66 * t, neck=180 + 50 * t,
             leg=(8 * t, 6 * t, 90), leg2=leg2,
             arm=(10 - 6 * t, 6 - 4 * t), props=props)


def calf(t, single=False, bent=False, seated=False, eccentric=False):
    lift = 22 * t
    if seated:
        return P(py=BASE_PY - 70, torso=186, leg=(88, -4, 90), leg2=(84, -8, 92),
                 arm=(30, 40), props=[{"kind": "chair", "x": 420}])
    knee = 26 if bent else 0
    return P(py=BASE_PY - lift, leg=(knee, knee - 2, 90 - 26 * t),
             leg2=None if single else (knee + 3, knee, 94 - 24 * t),
             arm=(8, 6), torso=180)


def tib_raise(t):
    return P(py=BASE_PY, torso=196, leg=(-6, 2, 90 + 30 * t),
             leg2=(-4, 4, 92 + 28 * t), arm=(10, 6),
             props=[{"kind": "wall", "x": 210}])


def bridge(t, single=False, hamstring=False, thrust=False):
    py = 476
    lift = 78 * t
    props = []
    if thrust:
        props.append({"kind": "box", "x": 180, "w": 150, "h": 96})
    if single:
        leg2 = (150, 130, 90)
    else:
        leg2 = None
    return P(px=330, py=py - lift, torso=90, neck=90, leg=(96, 170, 90),
             leg2=leg2, arm=(150, 100), props=[{"kind": "mat", "x": 150, "w": 360}] + props)


def plank(t, side=False):
    if side:
        return P(px=330, py=500, torso=100, neck=95, leg=(8, 2, 90),
                 leg2=(6, 0, 92), arm=(60, 90), props=[{"kind": "mat", "x": 150, "w": 380}])
    return P(px=340, py=486, torso=94, neck=88, leg=(16, 0, 90),
             leg2=(14, 2, 92), arm=(-40, 60), props=[{"kind": "mat", "x": 140, "w": 380}])


def quadruped(t, kind="birddog"):
    kw = dict(px=330, py=440, torso=96, neck=90, arm=(8, 8),
              props=[{"kind": "mat", "x": 120, "w": 400}])
    if kind == "birddog":
        kw.update(leg=(0, 272, 250),
                  leg2=(270, 272, 250) if t > 0.5 else (0, 272, 250),
                  arm2=(90, 90) if t > 0.5 else (10, 10))
    elif kind == "hydrant":
        kw.update(leg=(0, 272, 250), leg2=(60, 20 + 40 * t, 90), arm2=(10, 10))
    else:
        kw.update(leg=(0, 272, 250), leg2=(0, 200 + 40 * t, 250), arm2=(10, 10))
    return P(**kw)


def supine(t, kind="deadbug"):
    if kind == "hollow":
        return P(px=320, py=500, torso=86, neck=80, leg=(50, 34, 90),
                 leg2=(50, 30, 92), arm=(150, 160),
                 props=[{"kind": "mat", "x": 140, "w": 380}])
    if kind == "reversecrunch":
        return P(px=320, py=500, torso=88, neck=82, leg=(60 + 60 * t, 30 + 60 * t, 90),
                 leg2=(58 + 62 * t, 28 + 60 * t, 92), arm=(120, 100),
                 props=[{"kind": "mat", "x": 140, "w": 380}])
    if kind == "breathing":
        return P(px=320, py=506, torso=90, neck=86, leg=(40, 34, 90),
                 leg2=(38, 30, 92), arm=(120, 96),
                 props=[{"kind": "mat", "x": 140, "w": 380}])
    if kind == "legsuplwall":
        return P(px=250, py=520, torso=90, neck=86, leg=(-100, -96, 20),
                 leg2=(-96, -92, 24), arm=(120, 96),
                 props=[{"kind": "wall", "x": 520}, {"kind": "mat", "x": 80, "w": 320}])
    # dead bug: opposite arm and leg lower
    return P(px=320, py=500, torso=90, neck=84, leg=(60 + 62 * t, 40 + 40 * t, 90),
             leg2=(58, 34, 92), arm=(170 + 30 * t, 176),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def prone(t):
    return P(px=320, py=520, torso=96, neck=80, leg=(0, 0, 90),
             leg2=(-2, 2, 92), arm=(176 - 26 * t, 174 - 20 * t),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def side_lying(t, kind="clamshell"):
    if kind == "legraise":
        return P(px=300, py=500, torso=90, neck=86, leg=(0, 0, 90),
                 leg2=(0, 0 - 34 * t, 90), arm=(60, 20), arm2=(40, 10),
                 props=[{"kind": "mat", "x": 140, "w": 380}])
    return P(px=300, py=500, torso=90, neck=86, leg=(0, 0, 90),
             leg2=(0, -40 * t, 90), arm=(60, 20), arm2=(40, 10),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def nordic(t):
    return P(px=330, py=470, torso=90 - 56 * t, neck=88 - 40 * t,
             leg=(-96, -4, 90), leg2=(-92, -8, 92), arm=(120, 130),
             props=[{"kind": "mat", "x": 140, "w": 420}])


def wall_sit(t=1):
    return P(py=470, torso=180, leg=(76, 2, 90), leg2=(72, 6, 94),
             arm=(70, 80), props=[{"kind": "wall", "x": 210}])


def hip_thrust(t):
    return P(px=330, py=486 - 70 * t, torso=90, neck=90, leg=(96, 170, 90),
             arm=(150, 100), props=[{"kind": "box", "x": 170, "w": 160, "h": 100},
                                    {"kind": "mat", "x": 140, "w": 360}])


# --------------------------------------------------------------------------- #
# Core / dynamic
# --------------------------------------------------------------------------- #
def mountain_climber(t):
    return P(px=340, py=486, torso=94, neck=88, leg=(16 + 70 * t, 4, 90),
             leg2=(-6 - 40 * t, -30, 90), arm=(-40, 60),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def bear_crawl(t):
    return P(px=320, py=480, torso=94, neck=84, leg=(20 + 30 * t, 10, 90),
             leg2=(18, 12, 92), arm=(-30 + 20 * t, 50),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def pallof(t):
    return P(py=BASE_PY, torso=178, leg=(8, 4, 90), leg2=(6, 6, 94),
             arm=(70 + 10 * t, 96 + 30 * t),
             props=[{"kind": "band", "a": "wrist", "b": "wrist2"}])


def russian_twist(t):
    return P(px=330, py=500 - 40, torso=150, neck=150, leg=(70, 20, 90),
             leg2=(68, 24, 92), arm=(100 + 26 * t, 120),
             props=[{"kind": "mat", "x": 150, "w": 380}])


def carry(t, both=True):
    return P(py=BASE_PY - 8 * t, torso=178, leg=(4, 2, 90), leg2=(-4, 6, 94),
             arm=(6, 4), arm2=(-6, 4),
             props=[{"kind": "dumbbell", "at": "wrist"}, {"kind": "dumbbell", "at": "wrist2"}])


def wall_run(t):
    return P(px=300, py=BASE_PY - 6 * t, torso=170, leg=(60 * t, 40 * t, 90),
             leg2=(-10, -20, 100), arm=(60, 80), arm2=(50, 70),
             props=[{"kind": "wall", "x": 440}])


# --------------------------------------------------------------------------- #
# Locomotion
# --------------------------------------------------------------------------- #
def run(t, kind="jog"):
    py = BASE_PY - 8 - 6 * t
    if kind == "highknees":
        leg = (86, -30, 90)
        leg2 = (-6, 4, 94)
        arm = (40 + 20 * t, 80)
    elif kind == "butt":
        leg = (-4, -116, 110)
        leg2 = (10, 2, 90)
        arm = (20, 40)
    elif kind == "askip":
        leg = (92 - 20 * t, -50, 90)
        leg2 = (-4, 2, 92)
        arm = (30, 70)
    elif kind == "bskip":
        leg = (92, 20 - 80 * t, 90)
        leg2 = (-6, 2, 92)
        arm = (30, 70)
    elif kind == "ankling":
        leg = (0, -6, 90 + 30 * t)
        leg2 = (-2, -4, 92 + 28 * t)
        arm = (8, 6)
    elif kind == "fastfeet":
        leg = (24 * t, -18 * t, 90)
        leg2 = (-26 * t, -10 * t, 96)
        arm = (20, 50)
    elif kind == "marching":
        leg = (76, -64, 90)
        leg2 = (-4, 2, 92)
        arm = (40, 70)
    elif kind == "bounding":
        leg = (60, -40, 90)
        leg2 = (-40, -30, 96)
        arm = (50, 80)
    elif kind == "strides":
        leg = (44, -26, 90)
        leg2 = (-36, -28, 96)
        arm = (44, 70)
    else:  # jog
        leg = (30 + 10 * t, -18, 90)
        leg2 = (-26, -34, 96)
        arm = (26, 60)
    return P(py=py, torso=176, leg=leg, leg2=leg2, arm=arm)


def walk(t, kind="walk"):
    if kind == "incline":
        return P(py=BASE_PY + 10, torso=172, leg=(28 * t, -6, 90),
                 leg2=(-16 * t, -10, 96), arm=(30, 50))
    if kind == "downhill":
        return P(py=BASE_PY + 6, torso=184, leg=(36 * t, -18, 90),
                 leg2=(-20 * t, -12, 96), arm=(20, 40))
    if kind == "hiking":
        return P(py=BASE_PY - 4, torso=170, leg=(40 * t, -10, 90),
                 leg2=(-20 * t, -6, 96), arm=(34, 60))
    if kind == "stairs":
        return P(py=BASE_PY - 8, torso=176, leg=(52 * t, -6, 90),
                 leg2=(-10 * t, 2, 94), arm=(28, 50),
                 props=[{"kind": "stairs"}])
    return P(py=BASE_PY + 4 * t, torso=178, leg=(18 * t, -4, 90),
             leg2=(-16 * t, -6, 96), arm=(14, 20))


def carioca(t):
    return P(py=BASE_PY - 2, torso=178, leg=(10 * t, -6, 90),
             leg2=(-18 * t, -10, 96), arm=(70, 40))


def balance(t, kind="flat"):
    py = BASE_PY - 8 * t
    leg = (46 * t, -66 * t, 90)
    return P(py=py, torso=178, leg=leg, leg2=(0, 0, 90), arm=(70, 40),
             props=[{"kind": "mat", "x": 220, "w": 200}] if kind == "soft" else [])


def lateral_walk(t, monster=False):
    py = BASE_PY + 30
    return P(py=py, torso=176, leg=(56, 8, 90), leg2=(52, 10, 94),
             arm=(30, 40),
             props=[{"kind": "band", "a": "ankle", "b": "ankle2"}])


def wall_ankle_band(t, kind="inversion"):
    return P(px=380, py=BASE_PY - 30, torso=182, leg=(52, -6, 90 + 10 * t),
             leg2=(0, 0, 90), arm=(20, 30),
             props=[{"kind": "band", "a": "ankle", "b": "ankle2"}])


# --------------------------------------------------------------------------- #
# Stretches and mobility
# --------------------------------------------------------------------------- #
def stretch_standing(t, kind="calf"):
    if kind == "quad":
        return P(py=BASE_PY, torso=180, leg=(-24, -96, 60),
                 leg2=(2, 0, 90), arm=(-40, -70), props=[{"kind": "wall", "x": 470}])
    if kind == "hamstring":
        return P(py=BASE_PY - 10, torso=150, leg=(30, -10, 90),
                 leg2=(-6, 2, 92), arm=(60, 70))
    if kind == "forwardfold":
        return P(py=BASE_PY + 20, torso=110, neck=110, leg=(6, 2, 90),
                 leg2=(4, 4, 92), arm=(40, 50))
    if kind == "adductor":
        return P(py=BASE_PY + 40, torso=168, leg=(40, 4, 90), leg2=(34, 8, 94),
                 arm=(60, 50))
    if kind == "hipextension":
        return P(py=BASE_PY, torso=178, leg=(-4, 2, 90), leg2=(-30 * t, 2, 96),
                 arm=(60, 60))
    if kind == "abduction":
        return P(py=BASE_PY, torso=178, leg=(2, 2, 90), leg2=(30 * t, 2, 96),
                 arm=(60, 60))
    # calf stretch at the wall
    return P(py=BASE_PY + 6, torso=170, leg=(34, -6, 90), leg2=(-34, -2, 96),
             arm=(70, 80), props=[{"kind": "wall", "x": 480}])


def stretch_kneeling(t, kind="hipflexor"):
    if kind == "pigeon":
        return P(px=320, py=500, torso=120, neck=120, leg=(96, 40, 90),
                 leg2=(-96, -4, 180), arm=(60, 70),
                 props=[{"kind": "mat", "x": 140, "w": 380}])
    if kind == "couch":
        return P(py=BASE_PY + 60, torso=186, leg=(-30, -96, 60), leg2=(60, 2, 90),
                 arm=(40, 20), props=[{"kind": "wall", "x": 180}])
    # hip flexor: back knee down, front foot flat
    return P(py=BASE_PY + 70, torso=186, leg=(-24, -96, 60), leg2=(60, 2, 90),
             arm=(40, 20), props=[{"kind": "mat", "x": 140, "w": 380}])


def stretch_seated(t, kind="9090"):
    if kind == "seatedcalf":
        return P(px=380, py=BASE_PY - 66, torso=186, leg=(88, -4, 90), leg2=(84, -8, 92),
                 arm=(30, 40), props=[{"kind": "chair", "x": 430}])
    if kind == "figure4":
        return P(px=320, py=500, torso=90, neck=90, leg=(100, 60, 90),
                 leg2=(96, 20, 90), arm=(140, 90),
                 props=[{"kind": "mat", "x": 140, "w": 380}])
    return P(px=340, py=500, torso=120, neck=120, leg=(96, 40, 90),
             leg2=(60, 120, 90), arm=(70, 80),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def childs_pose(t=0):
    return P(px=330, py=500, torso=130, neck=120, leg=(60, 120, 90),
             leg2=(58, 118, 92), arm=(120, 130),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def cat_cow(t):
    return P(px=330, py=470, torso=96, neck=80 + 20 * t, leg=(120, 8, 90),
             leg2=(120, 8, 92), arm=(-40, 10),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def downward_dog(t=0):
    return P(px=330, py=400, torso=140, neck=130, leg=(70, -10, 90),
             leg2=(68, -12, 92), arm=(150, 160),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def world_greatest(t):
    return P(px=320, py=470, torso=110, neck=100, leg=(110, 10, 90),
             leg2=(-20, -30, 90), arm=(-70, -40),
             props=[{"kind": "mat", "x": 120, "w": 420}])


def hip_opener(t):
    return P(px=320, py=470, torso=96, neck=80, leg=(120, 8, 90),
             leg2=(96, 4 - 56 * t, 90), arm=(-40, 10), arm2=(-40, 8),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def leg_swing(t, kind="front"):
    if kind == "side":
        return P(py=BASE_PY, torso=178, leg=(2, 2, 90), leg2=(46 * t, 2, 96),
                 arm=(60, 70))
    return P(py=BASE_PY, torso=178, leg=(2, 2, 90), leg2=(56 * t, -6, 96),
             arm=(60, 70))


def knee_hug(t):
    return P(py=BASE_PY - 8, torso=178, leg=(88 - 10 * t, -60, 90),
             leg2=(0, 0, 90), arm=(70, 120))


def hamstring_sweep(t):
    return P(py=BASE_PY + 8, torso=160 - 30 * t, neck=160, leg=(36, -4, 90),
             leg2=(-6, 2, 92), arm=(60, 40))


def arm_circle(t):
    return P(py=BASE_PY, torso=178, leg=(4, 2, 90), leg2=(-4, 4, 92),
             arm=(40 + 40 * t, 50), arm2=(-40, 50))


def ankle_knee_wall(t):
    return P(px=380, py=BASE_PY + 20, torso=170, leg=(34, -6, 90),
             leg2=(-2, 0, 90), arm=(70, 80), props=[{"kind": "wall", "x": 470}])


def deep_squat(t=1):
    return P(py=BASE_PY + 76, torso=168, leg=(80, 2, 90), leg2=(76, 6, 94),
             arm=(60, 50))


def adductor_rockback(t):
    return P(px=320, py=470, torso=100 - 20 * t, neck=90, leg=(100, 10, 90),
             leg2=(60, 4, 90), arm=(100, 90),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def hip_cars(t):
    return P(py=BASE_PY - 6, torso=178, leg=(70 + 20 * t, -40, 90),
             leg2=(2, 0, 90), arm=(60, 70))


def open_book(t):
    return P(px=320, py=500, torso=90, neck=86, leg=(70, 60, 90),
             leg2=(68, 58, 92), arm=(150, 120 + 60 * t),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def foam(t, kind="quads"):
    if kind == "quads":
        return P(px=330, py=540, torso=96, neck=86, leg=(0, 60, 90),
                 leg2=(2, 62, 92), arm=(60, 80),
                 props=[{"kind": "roller", "at": "hip"}, {"kind": "mat", "x": 140, "w": 380}])
    if kind == "calves":
        return P(px=330, py=520, torso=92, neck=90, leg=(10, 0, 90),
                 leg2=(10, 2, 92), arm=(120, 100),
                 props=[{"kind": "roller", "at": "ankle"}, {"kind": "mat", "x": 140, "w": 380}])
    if kind == "glutes":
        return P(px=330, py=500, torso=110, neck=100, leg=(80, 60, 90),
                 leg2=(70, 80, 90), arm=(120, 100),
                 props=[{"kind": "roller", "at": "hip"}, {"kind": "mat", "x": 140, "w": 380}])
    return P(px=330, py=500, torso=96, neck=88, leg=(20, 30, 90),
             leg2=(20, 32, 92), arm=(110, 100),
             props=[{"kind": "roller", "at": "knee"}, {"kind": "mat", "x": 140, "w": 380}])


def foot_seated(t, kind="shortfoot"):
    return P(px=400, py=BASE_PY - 60, torso=186, leg=(86, -4, 90), leg2=(0, 0, 90),
             arm=(40, 60),
             props=[{"kind": "towel", "at": "toe"}] if kind == "towel" else [])


def ankle_alphabet(t):
    return P(px=400, py=BASE_PY - 60, torso=186, leg=(84, -6, 90 - 14 * t), leg2=(0, 0, 90),
             arm=(40, 60))


def breathing(t):
    return P(px=330, py=512, torso=90, neck=86, leg=(40, 34, 90),
             leg2=(38, 30, 92), arm=(120, 96),
             props=[{"kind": "mat", "x": 140, "w": 380}])


def toe_yoga(t):
    return P(px=400, py=BASE_PY - 60, torso=186, leg=(86, -4, 90 + 18 * t), leg2=(0, 0, 90),
             arm=(40, 60))


# --------------------------------------------------------------------------- #
# Exercise -> frames
# --------------------------------------------------------------------------- #
def frames(kind, *args, **kw):
    """Build the frame list: most exercises show start and end of the motion."""
    if kind in ("static",):
        return [args[0]]
    return [args[0], args[1]]



# --------------------------------------------------------------------------- #
# Corrected floor / lying poses (y grows downward; 0=down, 90=right, 180=up)
# --------------------------------------------------------------------------- #
import math as _math


def _torso_to(pelvis, shoulder):
    dx = shoulder[0] - pelvis[0]
    dy = shoulder[1] - pelvis[1]
    return _math.degrees(_math.atan2(dx, dy))


def _leg_to(hip, foot, knee_up=1.0):
    """Two-bone solve: returns thigh angle and shin angle that reach `foot`."""
    dx, dy = foot[0] - hip[0], foot[1] - hip[1]
    dist = min(179.5, max(30, _math.hypot(dx, dy)))
    a = _math.degrees(_math.atan2(dx, dy))
    cos_knee = (92**2 + 88**2 - dist**2) / (2 * 92 * 88)
    cos_knee = max(-1, min(1, cos_knee))
    knee = _math.degrees(_math.acos(cos_knee))
    inner = _math.degrees(
        _math.acos(max(-1, min(1, (92**2 + dist**2 - 88**2) / (2 * 92 * dist))))
    )
    thigh = a - knee_up * inner
    return thigh, thigh + knee_up * knee


def bridge(t, single=False, hamstring=False, thrust=False):
    hip = (330.0, 505.0 - 27.0 * t)
    shoulder = (180.0, 505.0)
    thigh, shin = _leg_to(hip, (430.0, FLOOR - 2), knee_up=1)
    torso = _torso_to(hip, shoulder)
    return P(px=330, py=hip[1], torso=torso, neck=torso,
             leg=(thigh, shin, 90),
             leg2=None if not single else (thigh - 6, shin + 6, 90),
             arm=(88, 84), props=[{"kind": "mat", "x": 120, "w": 400}])


def plank(t, side=False):
    if side:
        return P(px=330, py=470, torso=95, neck=92, leg=(278, 278, 250),
                 leg2=(276, 276, 250), arm=(2, 270), arm2=(180, 180),
                 props=[{"kind": "mat", "x": 110, "w": 420}])
    return P(px=330, py=436, torso=96, neck=90, leg=(276, 276, 250),
             leg2=(274, 274, 250), arm=(14, 14), arm2=(16, 14),
             props=[{"kind": "mat", "x": 120, "w": 400}])


def quadruped(t, kind="birddog"):
    kw = dict(px=330, py=440, torso=96, neck=90, arm=(8, 8),
              props=[{"kind": "mat", "x": 120, "w": 400}])
    if kind == "birddog":
        kw.update(leg=(0, 272, 250),
                  leg2=(270, 272, 250) if t > 0.5 else (0, 272, 250),
                  arm2=(90, 90) if t > 0.5 else (10, 10))
    elif kind == "hydrant":
        kw.update(leg=(0, 272, 250), leg2=(60, 20 + 40 * t, 90), arm2=(10, 10))
    else:
        kw.update(leg=(0, 272, 250), leg2=(0, 200 + 40 * t, 250), arm2=(10, 10))
    return P(**kw)


def supine(t, kind="deadbug"):
    base = dict(px=330, py=470, torso=270, neck=270,
                props=[{"kind": "mat", "x": 120, "w": 400}])
    if kind == "hollow":
        return P(leg=(62, 62, 90), leg2=(60, 60, 90), arm=(190, 190), **base)
    if kind == "reversecrunch":
        return P(leg=(122 - 16 * t, 50 + 30 * t, 90), leg2=(120 - 16 * t, 52 + 28 * t, 90),
                 arm=(90, 90), **base)
    if kind == "breathing":
        return P(leg=(80, 20, 90), leg2=(78, 24, 90), arm=(90, 90), **base)
    if kind == "legsuplwall":
        return P(px=470, py=520, leg=(180, 180, 90), leg2=(176, 176, 90),
                 arm=(90, 90), props=[{"kind": "wall", "x": 560},
                                      {"kind": "mat", "x": 180, "w": 320}],
                 torso=270, neck=270)
    return P(leg=(100 + 22 * t, 30 + 22 * t, 90), leg2=(98, 32, 90),
             arm=(190 + 20 * t, 190), **base)


def side_lying(t, kind="clamshell"):
    base = dict(px=330, py=500, torso=270, neck=270,
                props=[{"kind": "mat", "x": 120, "w": 400}])
    if kind == "legraise":
        return P(leg=(95, 95, 90), leg2=(95, 95 - 30 * t, 90), arm=(90, 90),
                 arm2=(60, 90), **base)
    return P(leg=(100, 30, 90), leg2=(100, 30 - 30 * t, 90), arm=(90, 90),
             arm2=(60, 90), **base)


def prone(t):
    return P(px=330, py=520, torso=270, neck=270, leg=(90, 90, 90),
             leg2=(88, 88, 90), arm=(270, 270 - 30 * t),
             props=[{"kind": "mat", "x": 120, "w": 400}])


def nordic(t):
    return P(px=330, py=470, torso=180 - 78 * t, neck=180 - 70 * t,
             leg=(0, 270, 250), leg2=(2, 268, 250), arm=(30, 30),
             props=[{"kind": "mat", "x": 150, "w": 360}])


def childs_pose(t=0):
    return P(px=250, py=480, torso=100, neck=96, leg=(30, 270, 250),
             leg2=(28, 272, 250), arm=(120, 130),
             props=[{"kind": "mat", "x": 100, "w": 420}])


def cat_cow(t):
    return P(px=330, py=440, torso=96 + 10 * t, neck=90 + 16 * t,
             leg=(0, 272, 250), leg2=(2, 270, 250), arm=(8, 8), arm2=(8, 8),
             props=[{"kind": "mat", "x": 120, "w": 400}])


def downward_dog(t=0):
    return P(px=300, py=400, torso=55, neck=50, leg=(305, 305, 270),
             leg2=(303, 303, 270), arm=(60, 70),
             props=[{"kind": "mat", "x": 100, "w": 420}])


def stretch_seated(t, kind="9090"):
    if kind == "seatedcalf":
        return P(px=400, py=430, torso=186, leg=(88, -4, 90), leg2=(0, 0, 90),
                 arm=(30, 40), props=[{"kind": "chair", "x": 440}])
    if kind == "figure4":
        return P(px=330, py=500, torso=270, neck=270, leg=(105, 20, 90),
                 leg2=(80, 20, 90), arm=(90, 120),
                 props=[{"kind": "mat", "x": 120, "w": 400}])
    return P(px=330, py=470, torso=180, neck=180, leg=(90, 0, 90),
             leg2=(60, 300, 90), arm=(40, 30),
             props=[{"kind": "mat", "x": 120, "w": 400}])


def stretch_kneeling(t, kind="hipflexor"):
    if kind == "pigeon":
        return P(px=330, py=500, torso=120, neck=116, leg=(100, 40, 90),
                 leg2=(270, 270, 250), arm=(100, 110),
                 props=[{"kind": "mat", "x": 120, "w": 400}])
    if kind == "couch":
        return P(px=380, py=470, torso=186, leg=(270, 340, 60), leg2=(80, 0, 90),
                 arm=(40, 20), props=[{"kind": "wall", "x": 230}])
    return P(px=380, py=470, torso=186, leg=(270, 340, 60), leg2=(80, 0, 90),
             arm=(40, 20), props=[{"kind": "mat", "x": 120, "w": 400}])


def foam(t, kind="quads"):
    if kind == "calves":
        return P(px=330, py=520, torso=270, neck=270, leg=(80, 60, 90),
                 leg2=(78, 62, 90), arm=(90, 110),
                 props=[{"kind": "roller", "at": "ankle"}, {"kind": "mat", "x": 120, "w": 400}])
    if kind == "quads":
        return P(px=330, py=530, torso=270, neck=270, leg=(70, 40, 90),
                 leg2=(72, 42, 90), arm=(120, 140),
                 props=[{"kind": "roller", "at": "hip"}, {"kind": "mat", "x": 120, "w": 400}])
    if kind == "glutes":
        return P(px=330, py=510, torso=270, neck=270, leg=(110, 60, 90),
                 leg2=(100, 80, 90), arm=(120, 140),
                 props=[{"kind": "roller", "at": "hip"}, {"kind": "mat", "x": 120, "w": 400}])
    return P(px=330, py=520, torso=270, neck=270, leg=(90, 40, 90),
             leg2=(88, 42, 90), arm=(120, 140),
             props=[{"kind": "roller", "at": "knee"}, {"kind": "mat", "x": 120, "w": 400}])


EXERCISES = {}


def add(ex_id, frames_list, arrow=None, props=None):
    EXERCISES[ex_id] = {"frames": frames_list, "arrow": arrow}


# Warm-up
add("easy-jog", [run(0, "jog"), run(1, "jog")], arrow="knee")
add("ankle-circles", [P(py=BASE_PY, leg=(0, 0, 90), leg2=(30, 0, 90), arm=(8, 6)), P(py=BASE_PY, leg=(0, 0, 90), leg2=(30, 0, 130), arm=(8, 6))], arrow="toe2")
add("leg-swings-front-back", [leg_swing(0, "front"), leg_swing(1, "front")], arrow="toe2")
add("leg-swings-side-side", [leg_swing(0, "side"), leg_swing(1, "side")], arrow="toe2")
add("knee-hugs", [knee_hug(0), knee_hug(1)], arrow="knee")
add("walking-lunges", [lunge(0), lunge(1)], arrow="hip")
add("reverse-lunges", [lunge(0, back=True), lunge(1, back=True)], arrow="hip")
add("standing-calf-raises", [calf(0), calf(1)], arrow="hip")
add("a-skips", [run(0, "askip"), run(1, "askip")], arrow="knee")
add("b-skips", [run(0, "bskip"), run(1, "bskip")], arrow="toe")
add("high-knees", [run(0, "highknees"), run(1, "highknees")], arrow="knee")
add("butt-kicks", [run(0, "butt"), run(1, "butt")], arrow="toe")
add("ankling", [run(0, "ankling"), run(1, "ankling")], arrow="toe")
add("carioca", [carioca(0), carioca(1)], arrow="ankle2")
add("worlds-greatest-stretch", [world_greatest(0), world_greatest(1)], arrow="wrist")
add("dynamic-hip-openers", [hip_opener(0), hip_opener(1)], arrow="knee2")
add("strides", [run(0, "strides"), run(1, "strides")], arrow="knee")
add("arm-circles", [arm_circle(0), arm_circle(1)], arrow="wrist")
add("walking-knee-drives", [run(0, "marching"), run(1, "marching")], arrow="knee")
add("dynamic-hamstring-sweeps", [hamstring_sweep(0), hamstring_sweep(1)], arrow="wrist")

# Cool-down
add("walking-recovery", [walk(0), walk(1)], arrow="hip")
add("standing-calf-stretch", [stretch_standing(0), stretch_standing(1)], arrow="hip")
add("bent-knee-calf-stretch", [P(py=BASE_PY + 8, torso=170, leg=(34, -6, 90), leg2=(-34, -2, 96), arm=(70, 80), props=[{"kind": "wall", "x": 480}]),
                               P(py=BASE_PY + 8, torso=170, leg=(34, -6, 90), leg2=(-34, -30, 96), arm=(70, 80), props=[{"kind": "wall", "x": 480}])], arrow="heel")
add("standing-quad-stretch", [stretch_standing(0, "quad"), stretch_standing(1, "quad")], arrow="toe")
add("hamstring-stretch", [stretch_standing(0, "hamstring"), stretch_standing(1, "hamstring")], arrow="wrist")
add("hip-flexor-stretch", [stretch_kneeling(0), stretch_kneeling(1)], arrow="hip")
add("figure-four-glute-stretch", [stretch_seated(0, "figure4"), stretch_seated(1, "figure4")], arrow="knee2")
add("childs-pose", [childs_pose()], arrow=None)
add("adductor-stretch", [stretch_seated(0), stretch_seated(1)], arrow="knee2")
add("pigeon-pose", [stretch_kneeling(0, "pigeon"), stretch_kneeling(1, "pigeon")], arrow="hip")
add("thoracic-rotation", [open_book(0), open_book(1)], arrow="wrist")
add("deep-breathing", [breathing(0), breathing(1)], arrow="chest")
add("standing-forward-fold", [stretch_standing(0, "forwardfold"), stretch_standing(1, "forwardfold")], arrow="wrist")
add("gentle-ankle-mobility", [foot_seated(0), foot_seated(1)], arrow="toe")

# Foot & ankle
add("tibialis-raises", [tib_raise(0), tib_raise(1)], arrow="toe")
add("bent-knee-calf-raises", [calf(0, bent=True), calf(1, bent=True)], arrow="hip")
add("straight-knee-calf-raises", [calf(0), calf(1)], arrow="hip")
add("single-leg-calf-raises", [calf(0, single=True), calf(1, single=True)], arrow="hip")
add("short-foot", [foot_seated(0), foot_seated(1)], arrow="toe")
add("toe-yoga", [toe_yoga(0), toe_yoga(1)], arrow="toe")
add("toe-spreading", [foot_seated(0), foot_seated(1)], arrow="toe")
add("towel-scrunches", [foot_seated(0, "towel"), foot_seated(1, "towel")], arrow="toe")
add("single-leg-balance", [balance(0), balance(1)], arrow="hip")
add("single-leg-balance-eyes-closed", [balance(0), balance(1)], arrow="hip")
add("single-leg-balance-soft-surface", [balance(0, "soft"), balance(1, "soft")], arrow="hip")
add("ankle-inversion-band", [wall_ankle_band(0), wall_ankle_band(1)], arrow="toe")
add("ankle-eversion-band", [wall_ankle_band(0), wall_ankle_band(1)], arrow="toe")
add("banded-dorsiflexion", [foot_seated(0), foot_seated(1)], arrow="toe")
add("ankle-alphabet", [ankle_alphabet(0), ankle_alphabet(1)], arrow="toe")
add("single-leg-rdl", [P(py=BASE_PY + 20, torso=180 + 50, leg=(8, 2, 90), leg2=(-40, 2, 96), arm=(60, 80)),
                        P(py=BASE_PY + 26, torso=180 + 70, leg=(8, 2, 90), leg2=(-72, 2, 96), arm=(60, 80))], arrow="wrist")

# Strength
add("goblet-squat", [squat(0, "kettlebell"), squat(0.55, "kettlebell"), squat(1, "kettlebell")], arrow="hip")
add("bodyweight-squat", [squat(0), squat(1)], arrow="hip")
add("bulgarian-split-squat", [split_squat(0), split_squat(1)], arrow="hip")
add("forward-lunge", [lunge(0), lunge(1)], arrow="hip")
add("dumbbell-rdl", [hinge(0, load=True), hinge(1, load=True)], arrow="chest")
add("step-ups", [step(0), step(1)], arrow="hip")
add("step-downs", [step(0, down=True), step(1, down=True)], arrow="hip")
add("wall-sit", [wall_sit(0), wall_sit(1)], arrow="hip")
add("glute-bridge", [bridge(0), bridge(0.5), bridge(1)], arrow="hip")
add("single-leg-glute-bridge", [bridge(0, single=True), bridge(0.5, single=True), bridge(1, single=True)], arrow="hip")
add("hip-thrust", [hip_thrust(0), hip_thrust(1)], arrow="hip")
add("hamstring-bridge", [bridge(0, hamstring=True), bridge(1, hamstring=True)], arrow="hip")
add("nordic-hamstring-curl", [nordic(0), nordic(1)], arrow="head")
add("seated-calf-raises", [calf(0, seated=True), calf(1, seated=True)], arrow="toe")

# Glutes
add("clamshells", [side_lying(0, "clamshell"), side_lying(1, "clamshell")], arrow="knee2")
add("side-lying-leg-raises", [side_lying(0, "legraise"), side_lying(1, "legraise")], arrow="ankle2")
add("banded-lateral-walks", [lateral_walk(0), lateral_walk(1)], arrow="ankle")
add("monster-walks", [lateral_walk(0, True), lateral_walk(1, True)], arrow="ankle")
add("fire-hydrants", [quadruped(0, "hydrant"), quadruped(1, "hydrant")], arrow="knee2")
add("donkey-kicks", [quadruped(0, "donkey"), quadruped(1, "donkey")], arrow="ankle2")
add("hip-abduction", [P(py=BASE_PY, torso=176, leg=(2, 2, 90), leg2=(40, 2, 96), arm=(60, 60)),
                       P(py=BASE_PY, torso=176, leg=(2, 2, 90), leg2=(64, 2, 96), arm=(60, 60))], arrow="ankle2")
add("standing-hip-extensions", [P(py=BASE_PY, torso=176, leg=(-2, 2, 90), leg2=(-30, 2, 96), arm=(60, 60)),
                                 P(py=BASE_PY, torso=176, leg=(-2, 2, 90), leg2=(-56, 2, 96), arm=(60, 60))], arrow="ankle2")

# Core
add("plank", [plank(0)], arrow=None)
add("side-plank", [plank(0, side=True)], arrow=None)
add("dead-bug", [supine(0, "deadbug"), supine(1, "deadbug")], arrow="wrist2")
add("bird-dog", [quadruped(0, "birddog"), quadruped(1, "birddog")], arrow="wrist")
add("reverse-crunch", [supine(0, "reversecrunch"), supine(1, "reversecrunch")], arrow="knee")
add("hollow-body-hold", [supine(0, "hollow")], arrow=None)
add("mountain-climbers", [mountain_climber(0), mountain_climber(1)], arrow="knee")
add("pallof-press", [pallof(0), pallof(1)], arrow="wrist")
add("russian-twists", [russian_twist(0), russian_twist(1)], arrow="wrist")
add("superman-hold", [prone(0), prone(1)], arrow="wrist")
add("bear-crawl", [bear_crawl(0), bear_crawl(1)], arrow="wrist")
add("suitcase-carry", [carry(0), carry(1)], arrow="wrist")

# Mobility
add("90-90-hip", [stretch_seated(0, "9090"), stretch_seated(1, "9090")], arrow="knee2")
add("hip-cars", [hip_cars(0), hip_cars(1)], arrow="knee")
add("ankle-knee-to-wall", [ankle_knee_wall(0), ankle_knee_wall(1)], arrow="knee")
add("deep-squat-hold", [deep_squat(0), deep_squat(1)], arrow="hip")
add("couch-stretch", [stretch_kneeling(0, "couch"), stretch_kneeling(1, "couch")], arrow="hip")
add("adductor-rockbacks", [adductor_rockback(0), adductor_rockback(1)], arrow="hip")
add("cat-cow", [cat_cow(0), cat_cow(1)], arrow="chest")
add("downward-dog", [downward_dog(0), downward_dog(1)], arrow="hip")
add("ankle-dorsiflexion-mobility", [ankle_knee_wall(0), ankle_knee_wall(1)], arrow="knee")

# Drills
add("straight-leg-bounds", [run(0, "bounding"), run(1, "bounding")], arrow="knee")
add("fast-feet", [run(0, "fastfeet"), run(1, "fastfeet")], arrow="ankle")
add("bounding", [run(0, "bounding"), run(1, "bounding")], arrow="hip")
add("wall-running-drill", [wall_run(0), wall_run(1)], arrow="knee")
add("marching-a-drill", [run(0, "marching"), run(1, "marching")], arrow="knee")

# Trail
add("weighted-step-ups", [step(0), step(1)], arrow="hip")
add("single-leg-squats", [P(py=BASE_PY + 40, torso=176, leg=(50, 2, 90), leg2=(40, 2, 96), arm=(70, 80)),
                           P(py=BASE_PY + 76, torso=172, leg=(80, 2, 90), leg2=(70, 2, 96), arm=(70, 80))], arrow="hip")
add("lateral-lunges", [P(py=BASE_PY + 40, torso=176, leg=(40, 2, 90), leg2=(10, 2, 120), arm=(40, 40)),
                        P(py=BASE_PY + 40, torso=176, leg=(40, 2, 90), leg2=(10, 2, 150), arm=(40, 40))], arrow="ankle2")
add("lateral-step-downs", [step(0, down=True), step(1, down=True)], arrow="hip")
add("eccentric-calf-raises", [calf(0, single=True), calf(1, single=True, eccentric=True)], arrow="hip")
add("hiking-uphill-practice", [walk(0, "hiking"), walk(1, "hiking")], arrow="hip")
add("controlled-downhill-practice", [walk(0, "downhill"), walk(1, "downhill")], arrow="hip")
add("farmers-carry", [carry(0), carry(1)], arrow="hip")
add("incline-walking", [walk(0, "incline"), walk(1, "incline")], arrow="hip")
add("stair-climbing", [walk(0, "stairs"), walk(1, "stairs")], arrow="hip")

# Recovery
add("legs-up-the-wall", [supine(0, "legsuplwall")], arrow=None)
add("gentle-walking", [walk(0), walk(1)], arrow="hip")
add("foam-roll-calves", [foam(0, "calves"), foam(1, "calves")], arrow="hip")
add("foam-roll-quads", [foam(0, "quads"), foam(1, "quads")], arrow="hip")
add("foam-roll-hamstrings", [foam(0, "hamstrings"), foam(1, "hamstrings")], arrow="hip")
add("foam-roll-glutes", [foam(0, "glutes"), foam(1, "glutes")], arrow="hip")
add("gentle-hip-mobility", [stretch_seated(0, "figure4"), stretch_seated(1, "figure4")], arrow="knee2")
