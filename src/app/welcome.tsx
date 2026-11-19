import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import type { GestureResponderEvent, TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
// --------------------

const FONT_BOLD = 'SpaceGrotesk-Bold';
const FONT_ITALIC = 'SpaceGrotesk-BoldItalic';
const THUMB = 56;
const TRACK_PAD = 4;
const DASHES = Array.from({ length: 48 }, (_, i) => i);
const CHEVRONS = [0, 1, 2];

export default function WelcomeScreen() {
    const insets = useSafeAreaInsets();
    const { importPlanData } = useApp();
    const [name, setName] = useState('');
    const [busy, setBusy] = useState<null | 'excel' | 'calendar'>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [trackW, setTrackW] = useState(0);
    const [done, setDone] = useState(false);
    const [launching, setLaunching] = useState(false);

    const cleanName = name.trim();
    const hasName = cleanName.length > 0;

    // ---------- intro animation ----------
    const a1 = useMemo(() => new Animated.Value(0), []);
    const a2 = useMemo(() => new Animated.Value(0), []);
    const a3 = useMemo(() => new Animated.Value(0), []);
    const a4 = useMemo(() => new Animated.Value(0), []);

    useEffect(() => {
        const fade = (v: Animated.Value, delay: number) =>
            Animated.timing(v, {
                toValue: 1,
                duration: 520,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            });
        Animated.parallel([fade(a1, 0), fade(a2, 160), fade(a3, 320), fade(a4, 480)]).start();
    }, [a1, a2, a3, a4]);

    const rise = (v: Animated.Value, d = 20) => ({
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }],
    });

    // ---------- shake when name is missing ----------
    const shake = useMemo(() => new Animated.Value(0), []);
    const inputRef = useRef<TextInputInstance | null>(null);

    const requireName = useCallback(() => {
        if (hasName) return true;
        setStatus('Enter your name to get started.');
        inputRef.current?.focus();
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
    const maxX = Math.max(0, trackW - THUMB - TRACK_PAD * 2);
    const busyActive = busy !== null;
    const dragStart = useRef(0);

    const settled = (dx: number) => {
        if (hasName && !busyActive && maxX > 0 && dx >= maxX * 0.85) {
            Animated.timing(pan, {
                toValue: maxX,
                duration: 120,
                useNativeDriver: true,
            }).start(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
                setDone(true);
                setTimeout(() => setLaunching(true), 220);
            });
        } else {
            Animated.spring(pan, {
                toValue: 0,
                friction: 7,
                tension: 80,
                useNativeDriver: true,
            }).start();
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

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Tapping anywhere outside the field closes the keyboard. */}
            <Pressable style={styles.flex} onPress={Keyboard.dismiss} accessible={false}>
                <View style={[styles.root, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
                    {/* decoration: concentric rings */}
                    <View style={[styles.ring, styles.ringLg]} pointerEvents="none" />
                    <View style={[styles.ring, styles.ringMd]} pointerEvents="none" />
                    <View style={[styles.ring, styles.ringSm]} pointerEvents="none" />

                    {/* top bar */}
                    <Animated.View style={[styles.topBar, rise(a1, 10)]}>
                        <View style={styles.logo}>
                            <Ionicons name="flash" size={16} color={colors.accentInk} />
                        </View>
                        <Text style={styles.logoText}>{APP_NAME}</Text>
                        <View style={styles.flex} />
                        <Text style={styles.byLabel}>BY </Text>
                        <Text style={styles.byName}>{CREATOR}</Text>
                    </Animated.View>

                    {/* hero + name */}
                    <View style={styles.hero}>
                        <Animated.Text style={[styles.overline, rise(a2)]}>WELCOME</Animated.Text>
                        <Animated.Text style={[styles.headline, rise(a2)]}>
                            {hasName ? `Let’s run,\n${cleanName}.` : 'What should\nwe call you?'}
                        </Animated.Text>

                        <Animated.View
                            style={[
                                styles.inputWrap,
                                rise(a3),
                                {
                                    transform: [
                                        ...rise(a3).transform,
                                        { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) },
                                    ],
                                },
                            ]}
                        >
                            <TextInput
                                ref={inputRef}
                                value={name}
                                onChangeText={(t) => {
                                    setName(t);
                                    if (status === 'Enter your name to get started.') setStatus(null);
                                }}
                                placeholder="Your name"
                                placeholderTextColor={colors.faint}
                                style={styles.input}
                                autoCapitalize="words"
                                autoCorrect={false}
                                maxLength={24}
                                returnKeyType="done"
                                selectionColor={colors.accent}
                                accessibilityLabel="Your name"
                            />
                            <View style={[styles.inputLine, hasName && styles.inputLineActive]} />
                        </Animated.View>
                    </View>

                    {/* bottom */}
                    <Animated.View style={[styles.bottom, rise(a4, 28)]}>
                        <Text style={styles.sectionLabel}>HAVE A PLAN ALREADY?</Text>
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
                                    {done ? 'Let’s go' : hasName ? 'Slide to start training' : 'Enter your name first'}
                                </Text>
                                {!done && hasName ? (
                                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                                ) : null}
                            </Animated.View>

                            <Animated.View
                                onStartShouldSetResponder={() => true}
                                onMoveShouldSetResponder={() => true}
                                onResponderGrant={onGrant}
                                onResponderMove={onMove}
                                onResponderRelease={onRelease}
                                onResponderTerminate={onTerminate}
                                style={[
                                    styles.thumb,
                                    !hasName && styles.thumbLocked,
                                    { transform: [{ translateX: pan }] },
                                ]}
                                accessibilityRole="adjustable"
                                accessibilityLabel="Slide to start training"
                            >
                                <Ionicons
                                    name={done ? 'checkmark' : hasName ? 'arrow-forward' : 'lock-closed'}
                                    size={22}
                                    color={hasName ? colors.accentInk : colors.faint}
                                />
                            </Animated.View>
                        </View>
                    </Animated.View>
                </View>

                {launching ? <LaunchOverlay name={cleanName} onDone={finish} /> : null}
            </Pressable>
        </KeyboardAvoidingView>
    );
}

/**
 * The sprint that plays right after the slide: running lanes stream past, the
 * wordmark lands letter by letter, a progress line fills, then a lime circle
 * wipes the screen into the app.
 */
function LaunchOverlay({ name, onDone }: { name: string; onDone: () => void }) {
    const enter = useMemo(() => new Animated.Value(0), []);
    const letters = useMemo(() => [0, 1, 2].map(() => new Animated.Value(0)), []);
    const fast = useMemo(() => new Animated.Value(0), []);
    const slow = useMemo(() => new Animated.Value(0), []);
    const chev = useMemo(() => new Animated.Value(0), []);
    const pulse = useMemo(() => new Animated.Value(0), []);
    const pulseLate = useMemo(() => new Animated.Value(0), []);
    const line = useMemo(() => new Animated.Value(0), []);
    const wipe = useMemo(() => new Animated.Value(0), []);

    useEffect(() => {
        const spin = (value: Animated.Value, duration: number, delay = 0) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(value, {
                        toValue: 1,
                        duration,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            );

        const loops = [
            spin(fast, 620),
            spin(slow, 1020),
            spin(chev, 900),
            spin(pulse, 1500),
            spin(pulseLate, 1500, 750),
        ];
        loops.forEach((loop) => loop.start());

        Animated.sequence([
            Animated.timing(enter, {
                toValue: 1,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.stagger(
                70,
                letters.map((letter) =>
                    Animated.timing(letter, {
                        toValue: 1,
                        duration: 400,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    })
                )
            ),
            Animated.timing(line, {
                toValue: 1,
                duration: 900,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.delay(120),
            Animated.timing(wipe, {
                toValue: 1,
                duration: 440,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) onDone();
        });

        return () => loops.forEach((loop) => loop.stop());
    }, [chev, enter, fast, letters, line, onDone, pulse, pulseLate, slow, wipe]);

    const lanes: { top: `${number}%`; value: Animated.Value; opacity: number }[] = [
        { top: '15%', value: slow, opacity: 0.55 },
        { top: '27%', value: fast, opacity: 0.3 },
        { top: '73%', value: fast, opacity: 0.28 },
        { top: '85%', value: slow, opacity: 0.5 },
    ];

    const ring = (value: Animated.Value) => ({
        opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0], extrapolate: 'clamp' }),
        transform: [
            { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.4], extrapolate: 'clamp' as const }) },
        ],
    });

    // Chevrons light up one after another, like feet hitting the ground.
    const chase = (index: number) =>
        chev.interpolate({
            inputRange: [index * 0.16, index * 0.16 + 0.2, index * 0.16 + 0.5],
            outputRange: [0.12, 1, 0.12],
            extrapolate: 'clamp',
        });

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
                                {
                                    translateX: lane.value.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -56],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {DASHES.map((dash) => (
                        <View key={dash} style={styles.dash} />
                    ))}
                </Animated.View>
            ))}

            <Animated.View style={[styles.pulseRing, ring(pulse)]} />
            <Animated.View style={[styles.pulseRing, ring(pulseLate)]} />

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
                <Text style={styles.launchOverline}>
                    {name ? `READY, ${name.toUpperCase()}` : 'READY, RUNNER'}
                </Text>

                <View style={styles.wordRow}>
                    {'RUN'.split('').map((letter, index) => (
                        <Animated.Text
                            key={index}
                            style={[
                                styles.letter,
                                {
                                    opacity: letters[index],
                                    transform: [
                                        {
                                            translateY: letters[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [56, 0],
                                            }),
                                        },
                                        {
                                            rotate: letters[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['-10deg', '0deg'],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            {letter}
                        </Animated.Text>
                    ))}
                    <Animated.Text style={[styles.letter, styles.letterDot, { opacity: letters[2] }]}>
                        .
                    </Animated.Text>
                </View>

                <View style={styles.chevRow}>
                    {CHEVRONS.map((index) => (
                        <Animated.View key={index} style={{ opacity: chase(index) }}>
                            <Ionicons name="chevron-forward" size={20} color={colors.accent} />
                        </Animated.View>
                    ))}
                </View>

                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                transform: [
                                    {
                                        translateX: line.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [-180, 0],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                </View>
            </Animated.View>

            <Animated.View
                style={[
                    styles.wipe,
                    {
                        opacity: wipe.interpolate({
                            inputRange: [0, 0.02],
                            outputRange: [0, 1],
                            extrapolate: 'clamp',
                        }),
                        transform: [
                            { scale: wipe.interpolate({ inputRange: [0, 1], outputRange: [0.001, 14] }) },
                        ],
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

    /* decoration */
    ring: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: `${colors.accent}33`,
    },
    ringLg: { width: 460, height: 460, top: -200, right: -210 },
    ringMd: { width: 320, height: 320, top: -130, right: -140, borderColor: `${colors.accent}55` },
    ringSm: {
        width: 190,
        height: 190,
        top: -60,
        right: -70,
        borderWidth: 0,
        backgroundColor: `${colors.accent}1A`,
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
    byLabel: { color: colors.faint, fontFamily: FONT_BOLD, fontSize: 10, letterSpacing: 1.2 },
    byName: { color: colors.accent, fontFamily: FONT_BOLD, fontStyle: 'italic', fontSize: 12 },

    /* hero */
    hero: { flex: 1, justifyContent: 'center', gap: 12 },
    overline: {
        color: colors.accent,
        fontFamily: FONT_BOLD,
        fontSize: 11,
        letterSpacing: 1.6,
    },
    headline: {
        color: colors.text,
        fontFamily: FONT_ITALIC,
        fontSize: 46,
        lineHeight: 48,
        letterSpacing: -1.6,
    },
    inputWrap: { marginTop: 14 },
    input: {
        color: colors.text,
        fontFamily: FONT_ITALIC,
        fontSize: 28,
        letterSpacing: -0.6,
        paddingVertical: 10,
        paddingHorizontal: 0,
    },
    inputLine: { height: 2, borderRadius: 1, backgroundColor: colors.border },
    inputLineActive: { backgroundColor: colors.accent },

    /* bottom */
    bottom: { gap: 12 },
    sectionLabel: { color: colors.faint, fontFamily: FONT_BOLD, fontSize: 10, letterSpacing: 1.2 },
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
        gap: 6,
        paddingLeft: THUMB,
    },
    trackLabel: {
        color: colors.muted,
        fontFamily: FONT_ITALIC,
        fontSize: 15,
    },
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

    /* launch sprint */
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
    pulseRing: {
        position: 'absolute',
        width: 190,
        height: 190,
        borderRadius: 95,
        borderWidth: 1.5,
        borderColor: colors.accent,
    },
    launchCenter: { alignItems: 'center', gap: 10 },
    launchOverline: {
        color: colors.accent,
        fontFamily: FONT_BOLD,
        fontSize: 11,
        letterSpacing: 2.4,
    },
    wordRow: { flexDirection: 'row', alignItems: 'flex-end' },
    letter: {
        color: colors.text,
        fontFamily: FONT_ITALIC,
        fontSize: 84,
        lineHeight: 88,
        letterSpacing: -6,
        marginRight: 6,
    },
    letterDot: { color: colors.accent, marginRight: 0 },
    chevRow: { flexDirection: 'row', marginTop: 2 },
    progressTrack: {
        width: 180,
        height: 3,
        borderRadius: 2,
        backgroundColor: colors.surfaceAlt,
        overflow: 'hidden',
        marginTop: 6,
    },
    progressFill: { width: 180, height: 3, backgroundColor: colors.accent },
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