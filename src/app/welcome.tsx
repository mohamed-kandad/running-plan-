import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NameKeyboard } from '@/components/NameKeyboard';
import { importPlanFromCalendar } from '@/lib/calendarSync';
import { describeImport as describeExcelImport, importPlanFromFile } from '@/lib/importPlan';
import { markOnboardingSeen } from '@/lib/onboarding';
import { saveUserName } from '@/lib/userName';
import { useApp } from '@/store/AppStore';
import { colors, radius } from '@/theme';

// ---- edit these ----
const CREATOR = 'M.kandad';
const APP_NAME = 'RUN';
const BG = '#0E0F0C';
const PAPER = '#F2EFE4';
const INK = '#14150F';
// --------------------

const FONT_BOLD = 'SpaceGrotesk-Bold';
const FONT_ITALIC = 'Archivo-BoldItalic';
const THUMB = 56;
const TRACK_PAD = 4;
const DASHES = Array.from({ length: 48 }, (_, i) => i);
const CHEVRONS = [0, 1, 2];
const BARCODE = Array.from({ length: 30 }, (_, i) => 1 + ((i * 7) % 4));
const ERR_NAME = 'Enter your name to get started.';

// Ghost typing: the empty bib types its own placeholder until the runner taps it.
const PLACEHOLDER = 'Your name';
const TYPE_TICK = 120;
const TYPE_HOLD = 14;
const TYPE_CYCLE = PLACEHOLDER.length * 2 + TYPE_HOLD + 4;

// ---------- running track geometry (top-down stadium) ----------
const R = 100; // radius of the runner's lane
const S = 200; // length of each straight
const LANE = 36; // distance between lanes
const TW = S + 2 * (R + LANE);
const TH = 2 * (R + LANE);
const PERIM = 2 * S + 2 * Math.PI * R;
const DOT = 14;
const TRAIL = 8;
const SAMPLES = 96;

function pointAt(u: number) {
    let d = (((u % 1) + 1) % 1) * PERIM;
    const cx = TW / 2;
    const cy = TH / 2;
    const x0 = cx - S / 2;
    const x1 = cx + S / 2;
    const arc = Math.PI * R;
    if (d < S) return { x: x0 + d, y: cy - R };
    d -= S;
    if (d < arc) {
        const a = -Math.PI / 2 + d / R;
        return { x: x1 + R * Math.cos(a), y: cy + R * Math.sin(a) };
    }
    d -= arc;
    if (d < S) return { x: x1 - d, y: cy + R };
    d -= S;
    const a = Math.PI / 2 + d / R;
    return { x: x0 + R * Math.cos(a), y: cy + R * Math.sin(a) };
}

function pathInterp(lap: Animated.Value, offset: number) {
    const input: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
        const p = pointAt(i / SAMPLES - offset);
        input.push(i / SAMPLES);
        xs.push(p.x - DOT / 2);
        ys.push(p.y - DOT / 2);
    }
    return {
        x: lap.interpolate({ inputRange: input, outputRange: xs }),
        y: lap.interpolate({ inputRange: input, outputRange: ys }),
    };
}

/**
 * Placeholder that types itself in, holds, erases and starts again. It unmounts the
 * moment the real keypad opens, so focus always stops the animation.
 */
function TypingPlaceholder() {
    const [frame, setFrame] = useState(0);
    const [blink] = useState(() => new Animated.Value(1));

    useEffect(() => {
        const id = setInterval(() => setFrame((f) => (f + 1) % TYPE_CYCLE), TYPE_TICK);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(blink, { toValue: 0.15, duration: 470, useNativeDriver: true }),
                Animated.timing(blink, { toValue: 1, duration: 470, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [blink]);

    const typed =
        frame < PLACEHOLDER.length
            ? PLACEHOLDER.slice(0, frame)
            : frame < PLACEHOLDER.length + TYPE_HOLD
              ? PLACEHOLDER
              : frame < PLACEHOLDER.length * 2 + TYPE_HOLD
                ? PLACEHOLDER.slice(0, PLACEHOLDER.length * 2 + TYPE_HOLD - frame)
                : '';

    return (
        <>
            <Text style={[styles.inputText, styles.inputPlaceholder]} numberOfLines={1}>
                {typed}
            </Text>
            <Animated.View style={[styles.inputCaret, { opacity: blink }]} />
        </>
    );
}

/** A big tilted running track with a glowing runner endlessly circling it. */
function TrackBackdrop({ fade }: { fade: Animated.Value }) {
    const lap = useMemo(() => new Animated.Value(0), []);
    const trail = useMemo(
        () => Array.from({ length: TRAIL }, (_, k) => pathInterp(lap, k * 0.007)),
        [lap]
    );

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(lap, {
                toValue: 1,
                duration: 5600,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [lap]);

    return (
        <Animated.View style={[styles.track3d, { opacity: fade }]} pointerEvents="none">
            {[-LANE, 0, LANE].map((off) => {
                const h = 2 * (R + off);
                const w = S + h;
                return (
                    <View
                        key={off}
                        style={[
                            styles.lane2,
                            {
                                width: w,
                                height: h,
                                left: (TW - w) / 2,
                                top: (TH - h) / 2,
                                borderRadius: h / 2,
                                borderStyle: off === 0 ? 'dashed' : 'solid',
                                borderColor: off === 0 ? `${colors.accent}55` : `${colors.accent}26`,
                            },
                        ]}
                    />
                );
            })}

            {/* start / finish line */}
            <View
                style={[
                    styles.startLine,
                    { left: TW / 2 - S / 2 - 2, top: TH / 2 - R - LANE, height: LANE * 2 },
                ]}
            />

            {trail
                .slice()
                .reverse()
                .map((t, i) => {
                    const k = TRAIL - 1 - i; // 0 = head
                    return (
                        <Animated.View
                            key={k}
                            style={[
                                styles.runnerDot,
                                {
                                    opacity: k === 0 ? 1 : 0.5 - k * 0.055,
                                    transform: [
                                        { translateX: t.x },
                                        { translateY: t.y },
                                        { scale: k === 0 ? 1 : 1 - k * 0.09 },
                                    ],
                                },
                                k === 0 && styles.runnerHead,
                            ]}
                        />
                    );
                })}
        </Animated.View>
    );
}

export default function WelcomeScreen() {
    const insets = useSafeAreaInsets();
    const { importPlanData } = useApp();
    const [name, setName] = useState('');
    const [busy, setBusy] = useState<null | 'excel' | 'calendar'>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [trackW, setTrackW] = useState(0);
    const [done, setDone] = useState(false);
    const [launching, setLaunching] = useState(false);
    const [editing, setEditing] = useState(false);

    const cleanName = name.trim();
    const hasName = cleanName.length > 0;

    // a stable "bib number" derived from the name
    const bibNumber = useMemo(() => {
        if (!cleanName) return '000';
        let sum = 0;
        for (let i = 0; i < cleanName.length; i++) sum += cleanName.charCodeAt(i) * (i + 3);
        return String((sum * 37) % 900 + 100);
    }, [cleanName]);

    // ---------- intro animation ----------
    const a1 = useMemo(() => new Animated.Value(0), []);
    const a2 = useMemo(() => new Animated.Value(0), []);
    const a4 = useMemo(() => new Animated.Value(0), []);
    const drop = useMemo(() => new Animated.Value(0), []);

    useEffect(() => {
        const fade = (v: Animated.Value, delay: number) =>
            Animated.timing(v, {
                toValue: 1,
                duration: 520,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            });
        Animated.parallel([
            fade(a1, 0),
            fade(a2, 160),
            fade(a4, 560),
            Animated.sequence([
                Animated.delay(320),
                Animated.spring(drop, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }),
            ]),
        ]).start();
    }, [a1, a2, a4, drop]);

    const rise = (v: Animated.Value, d = 20) => ({
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }],
    });

    // ---------- name entry ----------
    const shake = useMemo(() => new Animated.Value(0), []);
    const caret = useMemo(() => new Animated.Value(0), []);

    // The bib lifts into the middle of the page: it is measured where it sits, then
    // animates from that exact spot, so the card reads as the same piece of paper.
    const bibRef = useRef<React.ComponentRef<typeof View> | null>(null);
    const focusRef = useRef<React.ComponentRef<typeof View> | null>(null);
    const bibRect = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
    const [pose, setPose] = useState<{ x: number; y: number; scale: number } | null>(null);
    const lift = useMemo(() => new Animated.Value(0), []);
    const scrim = useMemo(() => new Animated.Value(0), []);
    const keypad = useMemo(() => new Animated.Value(0), []);

    const openKeyboard = useCallback(() => {
        void Haptics.selectionAsync().catch(() => { });
        setStatus((current) => (current === ERR_NAME ? null : current));
        bibRef.current?.measureInWindow((x, y, w, h) => {
            bibRect.current = { x, y, w, h };
        });
        setEditing(true);
    }, []);

    const clearName = useCallback(() => {
        void Haptics.selectionAsync().catch(() => { });
        setName('');
        setStatus((current) => (current === ERR_NAME ? null : current));
    }, []);

    const closeKeyboard = useCallback(() => {
        if (!editing) return;
        Animated.parallel([
            Animated.timing(lift, {
                toValue: 0,
                duration: 240,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(scrim, { toValue: 0, duration: 220, useNativeDriver: true }),
            Animated.timing(keypad, {
                toValue: 0,
                duration: 210,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(() => {
            setEditing(false);
            setPose(null);
        });
    }, [editing, keypad, lift, scrim]);

    // Measure where the focused card landed, then fly it there from the bib.
    const measureFocus = useCallback(() => {
        if (pose) return;
        focusRef.current?.measureInWindow((fx, fy, fw, fh) => {
            const from = bibRect.current;
            if (!from || fw <= 0) {
                setPose({ x: 0, y: 120, scale: 0.9 });
                return;
            }
            setPose({
                x: from.x + from.w / 2 - (fx + fw / 2),
                y: from.y + from.h / 2 - (fy + fh / 2),
                scale: Math.min(1, from.w / fw),
            });
        });
    }, [pose]);

    useEffect(() => {
        if (!editing || !pose) return;
        Animated.parallel([
            Animated.timing(scrim, { toValue: 1, duration: 240, useNativeDriver: true }),
            Animated.spring(lift, {
                toValue: 1,
                friction: 8,
                tension: 46,
                useNativeDriver: true,
            }),
            Animated.spring(keypad, {
                toValue: 1,
                friction: 11,
                tension: 78,
                useNativeDriver: true,
            }),
        ]).start();
    }, [editing, pose, scrim, lift, keypad]);

    // The caret only blinks while the bib is being typed on.
    useEffect(() => {
        if (!editing) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(caret, { toValue: 1, duration: 540, useNativeDriver: true }),
                Animated.timing(caret, { toValue: 0, duration: 540, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [caret, editing]);

    const requireName = useCallback(() => {
        if (hasName) return true;
        setStatus(ERR_NAME);
        setEditing(true);
        Animated.sequence([
            Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
        return false;
    }, [hasName, shake]);

    // ---------- finish ----------
    const finish = useCallback(async () => {
        await saveUserName(cleanName);
        await markOnboardingSeen();
    }, [cleanName]);

    // ---------- imports ----------
    const handleExcel = async () => {
        if (!requireName()) return;
        setBusy('excel');
        setStatus(null);
        try {
            const result = await importPlanFromFile();
            if (!result) {
                setStatus('Import cancelled.');
                return;
            }
            importPlanData({ workouts: result.workouts, runs: result.runs });
            setStatus(describeExcelImport(result));
            setTimeout(finish, 900);
        } catch (error) {
            setStatus(errorMessage(error));
        } finally {
            setBusy(null);
        }
    };

    const handleCalendar = async () => {
        if (!requireName()) return;
        setBusy('calendar');
        setStatus(null);
        try {
            const result = await importPlanFromCalendar();
            importPlanData({ workouts: result.workouts, runs: result.runs });
            setStatus(
                result.workouts.length > 0
                    ? `${result.workouts.length} session${result.workouts.length === 1 ? '' : 's'} imported from your calendar.`
                    : 'No upcoming training sessions found in your calendar.'
            );
            setTimeout(finish, 900);
        } catch (error) {
            setStatus(errorMessage(error));
        } finally {
            setBusy(null);
        }
    };

    // ---------- slide to start ----------
    const pan = useMemo(() => new Animated.Value(0), []);
    const hint = useMemo(() => new Animated.Value(0), []);
    const maxX = Math.max(0, trackW - THUMB - TRACK_PAD * 2);
    const busyActive = busy !== null;
    const dragStart = useRef(0);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(hint, {
                toValue: 1,
                duration: 1100,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [hint]);

    const chase = (index: number) =>
        hint.interpolate({
            inputRange: [index * 0.16, index * 0.16 + 0.2, index * 0.16 + 0.5],
            outputRange: [0.15, 1, 0.15],
            extrapolate: 'clamp',
        });

    const settled = (dx: number) => {
        if (hasName && !busyActive && maxX > 0 && dx >= maxX * 0.85) {
            Animated.timing(pan, { toValue: maxX, duration: 120, useNativeDriver: true }).start(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { });
                setDone(true);
                setTimeout(() => setLaunching(true), 220);
            });
        } else {
            Animated.spring(pan, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }).start();
        }
    };

    const onGrant = (event: GestureResponderEvent) => {
        dragStart.current = event.nativeEvent.pageX;
        if (!hasName) requireName();
    };

    const onMove = (event: GestureResponderEvent) => {
        if (!hasName || busyActive) return;
        const dx = event.nativeEvent.pageX - dragStart.current;
        pan.setValue(Math.min(Math.max(dx, 0), maxX));
    };

    const onRelease = (event: GestureResponderEvent) => {
        settled(event.nativeEvent.pageX - dragStart.current);
    };

    const onTerminate = () => {
        Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
    };

    const fillX = pan.interpolate({
        inputRange: [0, Math.max(1, maxX)],
        outputRange: [THUMB + TRACK_PAD * 2 - trackW, 0],
        extrapolate: 'clamp',
    });
    const labelOpacity = pan.interpolate({
        inputRange: [0, Math.max(1, maxX * 0.5)],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const bibStyle = {
        opacity: drop.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' as const }),
        transform: [
            { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) },
            { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) },
            { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '-2deg'] }) },
        ],
    };

    // Where the card flies from, and how the keypad rises under it.
    const cardPose = pose
        ? {
              transform: [
                  { translateX: lift.interpolate({ inputRange: [0, 1], outputRange: [pose.x, 0] }) },
                  { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [pose.y, 0] }) },
                  { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [pose.scale, 1] }) },
                  { rotate: lift.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '0deg'] }) },
              ],
          }
        : undefined;
    const keypadPose = {
        opacity: keypad,
        transform: [{ translateY: keypad.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }],
    };

    // The phone keyboard is never opened: the bib is typed on our own keypad.
    return (
        <Pressable style={styles.flex} onPress={closeKeyboard} accessible={false}>
                <View style={[styles.root, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
                    <TrackBackdrop fade={a1} />

                    {/* top bar */}
                    <Animated.View style={[styles.topBar, rise(a1, 10)]}>
                        <View style={styles.logo}>
                            <Ionicons name="flash" size={16} color={colors.accentInk} />
                        </View>
                        <Text style={styles.logoText}>{APP_NAME}</Text>
                        <View style={styles.flex} />
                        <Text style={styles.byLabel}>by </Text>
                        <Text style={styles.byName}>{CREATOR}</Text>
                    </Animated.View>

                    {/* headline + race bib */}
                    <View style={styles.hero}>
                        <Animated.Text
                            style={[styles.headline, rise(a2)]}
                            numberOfLines={3}
                            adjustsFontSizeToFit
                            minimumFontScale={0.6}
                        >
                            {hasName ? `Looking fast,\n${cleanName}.` : 'Pin on your\nrace bib.'}
                        </Animated.Text>

                        <Animated.View ref={bibRef} style={[styles.bib, bibStyle]}>
                            <View style={[styles.pin, styles.pinTL]} />
                            <View style={[styles.pin, styles.pinTR]} />
                            <View style={[styles.pin, styles.pinBL]} />
                            <View style={[styles.pin, styles.pinBR]} />

                            <View style={styles.bibHead}>
                                <Text style={styles.bibBrand}>{APP_NAME}</Text>
                                <View style={styles.flex} />
                                <Text style={styles.bibNo}>No. {bibNumber}</Text>
                            </View>

                            <Pressable
                                onPress={openKeyboard}
                                accessibilityRole="button"
                                accessibilityLabel="Your name, opens the keypad">
                                <View style={styles.inputRow}>
                                    {hasName ? (
                                        <>
                                            <Text
                                                style={styles.inputText}
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                                minimumFontScale={0.5}>
                                                {name}
                                            </Text>
                                            <View style={styles.inputCaret} />
                                        </>
                                    ) : (
                                        <TypingPlaceholder />
                                    )}
                                </View>
                            </Pressable>
                            <View style={[styles.inputLine, hasName && styles.inputLineActive]} />

                            <View style={styles.bibFoot}>
                                <View style={styles.barcode}>
                                    {BARCODE.map((w, i) => (
                                        <View key={i} style={{ width: w, height: 16, backgroundColor: INK, marginRight: 2 }} />
                                    ))}
                                </View>
                                <View style={styles.flex} />
                                <Text style={styles.bibFootText}>First run</Text>
                            </View>
                        </Animated.View>
                    </View>

                    {/* bottom */}
                    <Animated.View style={[styles.bottom, rise(a4, 28)]}>
                        <Text style={styles.sectionLabel}>Already have a plan?</Text>
                        <View style={styles.importRow}>
                            <ImportChip
                                icon="document-text-outline"
                                label="Excel"
                                busy={busy === 'excel'}
                                disabled={busy !== null}
                                onPress={handleExcel}
                            />
                            <ImportChip
                                icon="calendar-outline"
                                label="Calendar"
                                busy={busy === 'calendar'}
                                disabled={busy !== null}
                                onPress={handleCalendar}
                            />
                        </View>

                        {status ? (
                            <View style={styles.status}>
                                <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                                <Text style={styles.statusText}>{status}</Text>
                            </View>
                        ) : null}

                        {/* slide to start */}
                        <View
                            style={[styles.track, !hasName && styles.trackLocked]}
                            onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
                        >
                            <Animated.View style={[styles.trackFill, { transform: [{ translateX: fillX }] }]} />

                            <Animated.View style={[styles.trackLabelWrap, { opacity: labelOpacity }]} pointerEvents="none">
                                <Text style={styles.trackLabel}>
                                    {done ? 'Go' : hasName ? 'Slide to start' : 'Enter your name first'}
                                </Text>
                                {!done && hasName ? (
                                    <View style={styles.chevRow}>
                                        {CHEVRONS.map((i) => (
                                            <Animated.View key={i} style={{ opacity: chase(i), marginLeft: -6 }}>
                                                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                                            </Animated.View>
                                        ))}
                                    </View>
                                ) : null}
                            </Animated.View>

                            <Animated.View
                                onStartShouldSetResponder={() => true}
                                onMoveShouldSetResponder={() => true}
                                onResponderGrant={onGrant}
                                onResponderMove={onMove}
                                onResponderRelease={onRelease}
                                onResponderTerminate={onTerminate}
                                style={[styles.thumb, !hasName && styles.thumbLocked, { transform: [{ translateX: pan }] }]}
                                accessibilityRole="adjustable"
                                accessibilityLabel="Slide to start training"
                            >
                                <Ionicons
                                    name={done ? 'checkmark' : hasName ? 'footsteps' : 'lock-closed'}
                                    size={22}
                                    color={hasName ? colors.accentInk : colors.faint}
                                />
                            </Animated.View>
                        </View>
                    </Animated.View>
                </View>

                {/* Typing mode: the bib lifts into the middle of the page and our
                    own keypad takes over the bottom of the screen. */}
                {editing ? (
                    <View
                        pointerEvents="box-none"
                        style={[
                            styles.typingLayer,
                            { paddingTop: insets.top, paddingBottom: insets.bottom },
                        ]}>
                        <Animated.View pointerEvents="none" style={[styles.typingScrim, { opacity: scrim }]} />

                        <View style={styles.typingCenter} pointerEvents="box-none">
                            <Animated.Text style={[styles.typingLabel, { opacity: scrim }]}>YOUR NAME</Animated.Text>

                            <Animated.View
                                ref={focusRef}
                                onLayout={measureFocus}
                                style={[styles.focusWrap, { opacity: pose ? 1 : 0 }, cardPose]}>
                                <Pressable
                                    onPress={() => { }}
                                    accessible={false}
                                    style={styles.focusCard}>
                                    <View style={[styles.pin, styles.pinTL]} />
                                    <View style={[styles.pin, styles.pinTR]} />
                                    <View style={[styles.pin, styles.pinBL]} />
                                    <View style={[styles.pin, styles.pinBR]} />

                                    <View style={styles.bibHead}>
                                        <Text style={styles.bibBrand}>{APP_NAME}</Text>
                                        <View style={styles.spacer} />
                                        <Text style={styles.bibNo}>No. {bibNumber}</Text>
                                    </View>

                                    <View style={styles.focusRow}>
                                        <Text
                                            style={[styles.focusName, !hasName && styles.focusPlaceholder]}
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.4}>
                                            {hasName ? name : 'Your name'}
                                        </Text>
                                        <Animated.View
                                            style={[
                                                styles.focusCaret,
                                                {
                                                    opacity: caret.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [1, 0.1],
                                                    }),
                                                },
                                            ]}
                                        />
                                        <View style={styles.spacer} />
                                        {hasName ? (
                                            <Pressable
                                                onPress={clearName}
                                                hitSlop={10}
                                                style={styles.clearButton}
                                                accessibilityRole="button"
                                                accessibilityLabel="Clear name">
                                                <Ionicons name="close" size={15} color={INK} />
                                            </Pressable>
                                        ) : null}
                                    </View>
                                    <View style={[styles.inputLine, styles.inputLineActive]} />

                                    <View style={styles.bibFoot}>
                                        <View style={styles.barcode}>
                                            {BARCODE.map((w, i) => (
                                                <View
                                                    key={i}
                                                    style={{ width: w, height: 16, backgroundColor: INK, marginRight: 2 }}
                                                />
                                            ))}
                                        </View>
                                        <View style={styles.spacer} />
                                        <Text style={styles.bibFootText}>First run</Text>
                                    </View>
                                </Pressable>
                            </Animated.View>

                            <Animated.Text style={[styles.typingHint, { opacity: scrim }]}>
                                Type on our keypad — the phone keyboard stays away.
                            </Animated.Text>
                        </View>

                        <Animated.View style={keypadPose}>
                            <NameKeyboard
                                value={name}
                                onChangeText={(next) => {
                                    setName(next);
                                    if (status === ERR_NAME) setStatus(null);
                                }}
                                onClose={closeKeyboard}
                                maxLength={18}
                            />
                        </Animated.View>
                    </View>
                ) : null}

                {launching ? <LaunchOverlay name={cleanName} onDone={finish} /> : null}
            </Pressable>
    );
}

const WORDS = [
    { text: 'On your marks', size: 40, accent: false },
    { text: 'Set', size: 64, accent: false },
    { text: 'Go.', size: 120, accent: true },
];

/**
 * Starting-gun sequence: speed lanes stream past while "On your marks / Set / Go."
 * land with haptic beats, then a lime circle wipes the screen into the app.
 */
function LaunchOverlay({ name, onDone }: { name: string; onDone: () => void }) {
    const enter = useMemo(() => new Animated.Value(0), []);
    const seq = useMemo(() => new Animated.Value(0), []);
    const fast = useMemo(() => new Animated.Value(0), []);
    const slow = useMemo(() => new Animated.Value(0), []);
    const wipe = useMemo(() => new Animated.Value(0), []);

    useEffect(() => {
        const spin = (value: Animated.Value, duration: number) =>
            Animated.loop(
                Animated.timing(value, {
                    toValue: 1,
                    duration,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
        const loops = [spin(fast, 520), spin(slow, 940)];
        loops.forEach((l) => l.start());

        const beats = [240, 740, 1240].map((ms, i) =>
            setTimeout(() => {
                Haptics.impactAsync(
                    i === 2 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
                ).catch(() => { });
            }, ms)
        );

        Animated.sequence([
            Animated.timing(enter, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(seq, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
            Animated.delay(140),
            Animated.timing(wipe, { toValue: 1, duration: 440, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished) onDone();
        });

        return () => {
            loops.forEach((l) => l.stop());
            beats.forEach(clearTimeout);
        };
    }, [enter, fast, onDone, seq, slow, wipe]);

    const lanes: { top: `${number}%`; value: Animated.Value; opacity: number }[] = [
        { top: '14%', value: slow, opacity: 0.5 },
        { top: '24%', value: fast, opacity: 0.3 },
        { top: '76%', value: fast, opacity: 0.3 },
        { top: '86%', value: slow, opacity: 0.5 },
    ];

    const wordStyle = (i: number) => {
        const a = i / 3;
        const b = (i + 1) / 3;
        const last = i === 2;
        return {
            opacity: seq.interpolate({
                inputRange: [a, a + 0.04, b - 0.04, b],
                outputRange: [0, 1, 1, last ? 1 : 0],
                extrapolate: 'clamp' as const,
            }),
            transform: [
                {
                    scale: seq.interpolate({
                        inputRange: [a, a + 0.07],
                        outputRange: [last ? 0.4 : 0.8, 1],
                        extrapolate: 'clamp' as const,
                    }),
                },
            ],
        };
    };

    return (
        <Animated.View style={[styles.launch, { opacity: enter }]} pointerEvents="none">
            {lanes.map((lane, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.lane,
                        {
                            top: lane.top,
                            opacity: lane.opacity,
                            transform: [
                                { translateX: lane.value.interpolate({ inputRange: [0, 1], outputRange: [0, -56] }) },
                            ],
                        },
                    ]}
                >
                    {DASHES.map((dash) => (
                        <View key={dash} style={styles.dash} />
                    ))}
                </Animated.View>
            ))}

            <Animated.View
                style={[
                    styles.launchCenter,
                    {
                        opacity: wipe.interpolate({
                            inputRange: [0, 0.55],
                            outputRange: [1, 0],
                            extrapolate: 'clamp',
                        }),
                    },
                ]}
            >
                <Text style={styles.launchSub}>{name ? `Good luck, ${name}` : 'Good luck'}</Text>
                <View style={styles.wordStack}>
                    {WORDS.map((w, i) => (
                        <Animated.Text
                            key={w.text}
                            style={[
                                styles.word,
                                { fontSize: w.size, lineHeight: w.size + 6 },
                                w.accent && { color: colors.accent },
                                wordStyle(i),
                            ]}
                        >
                            {w.text}
                        </Animated.Text>
                    ))}
                </View>
            </Animated.View>

            <Animated.View
                style={[
                    styles.wipe,
                    {
                        opacity: wipe.interpolate({ inputRange: [0, 0.02], outputRange: [0, 1], extrapolate: 'clamp' }),
                        transform: [{ scale: wipe.interpolate({ inputRange: [0, 1], outputRange: [0.001, 14] }) }],
                    },
                ]}
            />
        </Animated.View>
    );
}

function ImportChip({
    icon,
    label,
    busy,
    disabled,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    busy: boolean;
    disabled: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed, disabled && !busy && styles.dimmed]}
            accessibilityRole="button"
            accessibilityLabel={`Import from ${label}`}
        >
            {busy ? (
                <ActivityIndicator size="small" color={colors.accent} />
            ) : (
                <Ionicons name={icon} size={18} color={colors.accent} />
            )}
            <Text style={styles.chipText}>{label}</Text>
            <Ionicons name="arrow-up-outline" size={14} color={colors.faint} style={styles.chipArrow} />
        </Pressable>
    );
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: BG },
    root: {
        flex: 1,
        paddingHorizontal: 22,
        backgroundColor: BG,
        overflow: 'hidden',
    },

    /* running track backdrop */
    track3d: {
        position: 'absolute',
        width: TW,
        height: TH,
        left: '50%',
        marginLeft: -TW / 2,
        top: '17%',
        transform: [{ rotate: '-14deg' }],
    },
    lane2: { position: 'absolute', borderWidth: 1.5 },
    startLine: {
        position: 'absolute',
        width: 4,
        backgroundColor: `${colors.accent}88`,
        borderRadius: 2,
    },
    runnerDot: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: DOT,
        height: DOT,
        borderRadius: DOT / 2,
        backgroundColor: colors.accent,
    },
    runnerHead: {
        shadowColor: colors.accent,
        shadowOpacity: 1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },

    /* top bar */
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logo: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: colors.text,
        fontFamily: FONT_ITALIC,
        fontSize: 20,
        letterSpacing: -0.5,
    },
    byLabel: { color: colors.faint, fontFamily: FONT_ITALIC, fontSize: 11 },
    byName: { color: colors.accent, fontFamily: FONT_BOLD, fontSize: 12 },

    /* hero */
    hero: { flex: 1, justifyContent: 'center', gap: 26 },
    headline: {
        color: colors.text,
        fontFamily: FONT_ITALIC,
        fontSize: 46,
        lineHeight: 48,
        letterSpacing: -1.6,
    },

    /* race bib */
    bib: {
        backgroundColor: PAPER,
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
    },
    pin: {
        position: 'absolute',
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: '#CFCBBA',
        borderWidth: 2,
        borderColor: '#9C9886',
    },
    pinTL: { top: 7, left: 7 },
    pinTR: { top: 7, right: 7 },
    pinBL: { bottom: 7, left: 7 },
    pinBR: { bottom: 7, right: 7 },
    bibHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
    bibBrand: { color: INK, fontFamily: FONT_ITALIC, fontSize: 18, letterSpacing: -0.4 },
    bibNo: { color: '#7A7766', fontFamily: FONT_BOLD, fontSize: 12 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingVertical: 14,
        paddingHorizontal: 6,
    },
    inputText: { color: INK, fontFamily: FONT_ITALIC, fontSize: 34, letterSpacing: -0.8, flexShrink: 1 },
    inputPlaceholder: { color: '#A9A592' },
    inputCaret: { width: 3, height: 30, borderRadius: 2, backgroundColor: colors.accentInk, opacity: 0.85 },

    // named for the keypad mode
    spacer: { flex: 1 },
    typingLayer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: 'flex-end',
    },
    typingScrim: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: BG,
    },
    typingCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, gap: 14 },
    typingLabel: { color: colors.muted, fontFamily: FONT_BOLD, fontSize: 11, letterSpacing: 2.6 },
    typingHint: { color: colors.faint, fontFamily: FONT_BOLD, fontSize: 11 },
    focusWrap: { width: '100%', maxWidth: 460, alignSelf: 'center' },
    focusCard: {
        backgroundColor: PAPER,
        borderRadius: 14,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
    },
    focusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 10, paddingHorizontal: 6 },
    focusName: { color: INK, fontFamily: FONT_ITALIC, fontSize: 42, letterSpacing: -1, flexShrink: 1 },
    focusPlaceholder: { color: '#A9A592' },
    focusCaret: { width: 3, height: 40, borderRadius: 2, backgroundColor: colors.accentInk },
    clearButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E6E2D4',
        borderWidth: 1,
        borderColor: '#CFCBBA',
    },
    inputLine: { height: 3, borderRadius: 2, backgroundColor: '#CFCBBA', marginHorizontal: 6 },
    inputLineActive: { backgroundColor: colors.accent },
    bibFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingHorizontal: 6 },
    barcode: { flexDirection: 'row', alignItems: 'center' },
    bibFootText: { color: '#7A7766', fontFamily: FONT_BOLD, fontSize: 11 },

    /* bottom */
    bottom: { gap: 12 },
    sectionLabel: { color: colors.faint, fontFamily: FONT_BOLD, fontSize: 12 },
    importRow: { flexDirection: 'row', gap: 10 },
    chip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipText: { flex: 1, color: colors.text, fontFamily: FONT_ITALIC, fontSize: 14 },
    chipArrow: { transform: [{ rotate: '45deg' }] },
    status: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        padding: 10,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusText: { flex: 1, color: colors.text, fontSize: 11, lineHeight: 16 },

    /* slide to start */
    track: {
        height: THUMB + TRACK_PAD * 2,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        overflow: 'hidden',
        marginTop: 2,
    },
    trackLocked: { opacity: 0.7 },
    trackFill: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: colors.accent,
        borderRadius: radius.pill,
    },
    trackLabelWrap: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingLeft: THUMB,
    },
    trackLabel: { color: colors.muted, fontFamily: FONT_ITALIC, fontSize: 15 },
    chevRow: { flexDirection: 'row', alignItems: 'center' },
    thumb: {
        position: 'absolute',
        left: TRACK_PAD,
        width: THUMB,
        height: THUMB,
        borderRadius: THUMB / 2,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: BG,
    },
    thumbLocked: { backgroundColor: colors.surfaceAlt },

    /* launch sequence */
    launch: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BG,
        overflow: 'hidden',
    },
    lane: {
        position: 'absolute',
        left: -80,
        right: -80,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    dash: { width: 32, height: 3, borderRadius: 2, backgroundColor: colors.accent },
    launchCenter: { alignItems: 'center', gap: 14 },
    launchSub: { color: colors.muted, fontFamily: FONT_BOLD, fontSize: 13 },
    wordStack: { width: 340, height: 140, alignItems: 'center', justifyContent: 'center' },
    word: {
        position: 'absolute',
        color: colors.text,
        fontFamily: FONT_ITALIC,
        letterSpacing: -2,
        textAlign: 'center',
    },
    wipe: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 320,
        height: 320,
        marginTop: -160,
        marginLeft: -160,
        borderRadius: 160,
        backgroundColor: colors.accent,
    },

    pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
    dimmed: { opacity: 0.45 },
});