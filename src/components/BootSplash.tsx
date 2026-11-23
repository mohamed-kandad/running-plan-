import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/theme';

const WORD = 'RUN PLAN';
const MIN_VISIBLE_MS = 1500;
/** One print per step: alternating feet, lit in sequence like a run cadence. */
const PRINTS = 7;
const LANES = [0, 1, 2, 3, 4, 5];

/**
 * Brand boot screen, built as a night track. The native splash hands over the
 * moment the fonts are ready, so the app never opens on a blank window: the
 * runner lands, the wordmark types itself in, the pacer ring starts lapping and
 * a footprint trail beats out the cadence while the saved plan loads.
 */
export function BootSplash({
  ready,
  onHidden,
}: {
  /** True once fonts and saved state are both available. */
  ready: boolean;
  onHidden: () => void;
}) {
  const [letters] = useState(() => WORD.split('').map(() => new Animated.Value(0)));
  const [mark] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const [counter] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const [halo] = useState(() => new Animated.Value(0));
  const [sweep] = useState(() => new Animated.Value(0));
  const [print] = useState(() => new Animated.Value(0));
  const [progress] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [km, setKm] = useState(0);

  const mountedAt = useRef(0);
  const hidden = useRef(false);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  // Entrance: the mark drops onto the track, then the wordmark types itself in.
  useEffect(() => {
    Animated.sequence([
      Animated.timing(mark, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.stagger(
        58,
        letters.map((letter) =>
          Animated.timing(letter, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
    ]).start();

    Animated.timing(progress, {
      toValue: 0.7,
      duration: 1200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [letters, mark, progress]);

  // Everything that keeps moving while the app wakes up.
  useEffect(() => {
    const loops = [
      Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 2800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      // A stride is two steps, so the cadence beats twice as fast as the lap.
      Animated.loop(
        Animated.timing(counter, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, {
            toValue: 1,
            duration: 210,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bob, {
            toValue: 0,
            duration: 210,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(halo, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(halo, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
      // Speed lines shuttle back and forth instead of jumping, so the loop reads
      // as motion blur rather than a reset.
      Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sweep, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.timing(print, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ];

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [spin, counter, bob, halo, sweep, print]);

  // Odometers on the footer: the distance ticks up while the splash is up.
  useEffect(() => {
    const id = setInterval(() => setKm((value) => (value + 1) % 120), 160);
    return () => clearInterval(id);
  }, []);

  // Hand over to the app: fill the bar, hold the minimum, then fade away.
  useEffect(() => {
    if (!ready) return;

    Animated.timing(progress, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    const shownFor = mountedAt.current > 0 ? Date.now() - mountedAt.current : MIN_VISIBLE_MS;
    const wait = Math.max(0, MIN_VISIBLE_MS - shownFor);
    const timer = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 280,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !hidden.current) {
          hidden.current = true;
          onHidden();
        }
      });
    }, wait);

    return () => clearTimeout(timer);
  }, [ready, progress, fade, onHidden]);

  const markSpin = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const markSpinBack = spin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.08] });
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  const sweepA = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, 34] });
  const sweepB = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, -26] });
  const sweepC = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, 58] });

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    // The splash is decoration: taps belong to the screen underneath it.
    <Animated.View pointerEvents="none" style={[styles.root, { opacity: fade }]}>
      {/* Night track: diagonal lanes and a lime bloom under the runner. */}
      <View pointerEvents="none" style={styles.lanes}>
        {LANES.map((i) => (
          <View key={i} style={[styles.lane, { left: -140 + i * 88 }]} />
        ))}
      </View>
      {/* Speed blur: horizontal lines that shuttle across the middle band. */}
      <View pointerEvents="none" style={styles.band}>
        <Animated.View style={[styles.speedLine, styles.lineA, { transform: [{ translateX: sweepA }] }]} />
        <Animated.View style={[styles.speedLine, styles.lineB, { transform: [{ translateX: sweepB }] }]} />
        <Animated.View style={[styles.speedLine, styles.lineC, { transform: [{ translateX: sweepC }] }]} />
        <Animated.View style={[styles.speedLine, styles.lineD, { transform: [{ translateX: sweepA }] }]} />
      </View>

      <View style={styles.center}>
        <View style={styles.ringWrap}>
          <View style={styles.ringBase} />
          <Animated.View
            pointerEvents="none"
            style={[styles.ringArc, { transform: [{ rotate: markSpin }] }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.ringArcSoft, { transform: [{ rotate: markSpinBack }] }]}
          />
          <Animated.View
            style={{
              opacity: mark,
              transform: [
                { scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.68, 1] }) },
              ],
            }}>
            <Animated.View style={{ transform: [{ translateY: bobY }] }}>
              <Animated.View style={[styles.markHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
              <Image
                source={require('../../assets/splash-icon.png')}
                style={styles.mark}
                accessibilityIgnoresInvertColors
              />
            </Animated.View>
          </Animated.View>
        </View>

        <View style={styles.wordRow}>
          {WORD.split('').map((letter, index) => (
            <Animated.Text
              key={`${letter}-${index}`}
              style={[
                styles.word,
                {
                  opacity: letters[index],
                  transform: [
                    {
                      translateY: letters[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [26, 0],
                      }),
                    },
                    {
                      rotate: letters[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-7deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}>
              {letter}
            </Animated.Text>
          ))}
          <Animated.View
            style={[
              styles.wordDot,
              {
                opacity: letters[WORD.length - 1],
                transform: [
                  {
                    scale: letters[WORD.length - 1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
        <Text style={styles.tagline}>RUNNING PLAN</Text>
      </View>

      {/* Cadence trail: alternating footprints light up left to right, forever. */}
      <View pointerEvents="none" style={styles.printer}>
        {Array.from({ length: PRINTS }, (_, i) => {
          const start = 0.02 + i * 0.1;
          return (
            <Animated.View
              key={i}
              style={[
                styles.print,
                i % 2 === 0 ? styles.printLeft : styles.printRight,
                {
                  opacity: print.interpolate({
                    inputRange: [0, start, start + 0.1, start + 0.26],
                    outputRange: [0.1, 0.1, 0.9, 0.1],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.caption}>{ready ? 'READY' : 'SETTING THE PACE'}</Text>
          <Text style={styles.captionAccent}>{(km / 10).toFixed(1)} KM</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lanes: { position: 'absolute', top: -240, bottom: -240, left: 0, right: 0 },
  lane: {
    position: 'absolute',
    top: -240,
    bottom: -240,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
    transform: [{ rotate: '16deg' }],
  },

  // Each speed dash gets its own row, so they read as separate lines flicking past
  // the hero instead of a single horizon line.
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 260,
    marginTop: -130,
  },
  speedLine: { position: 'absolute', height: 1, backgroundColor: colors.accent },
  lineA: { top: 26, left: '-6%', width: '32%', opacity: 0.16 },
  lineB: { top: 92, right: '-4%', width: '26%', opacity: 0.1 },
  lineC: { top: 186, left: '16%', width: '14%', opacity: 0.2 },
  lineD: { top: 214, right: '14%', width: '10%', opacity: 0.12 },

  center: { alignItems: 'center', gap: 14, marginBottom: 6 },
  ringWrap: { width: 224, height: 224, alignItems: 'center', justifyContent: 'center' },
  ringBase: {
    position: 'absolute',
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  ringArc: {
    position: 'absolute',
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: colors.accent,
  },
  ringArcSoft: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomColor: 'rgba(212,255,0,0.45)',
  },
  markHalo: {
    position: 'absolute',
    top: -18,
    left: -18,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(212,255,0,0.16)',
  },
  mark: { width: 92, height: 92 },

  wordRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  word: {
    color: colors.text,
    fontFamily: 'ArchivoBlack-Italic',
    fontWeight: '900',
    fontSize: 46,
    letterSpacing: -2,
    lineHeight: 54,
  },
  wordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginLeft: 5,
    marginBottom: 12,
  },
  tagline: { color: colors.muted, ...font.mono, fontSize: 10, letterSpacing: 4.5 },

  printer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 136,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 26,
  },
  print: {
    width: 9,
    height: 15,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  printLeft: { transform: [{ rotate: '-14deg' }] },
  printRight: { transform: [{ rotate: '14deg' }], marginTop: 8 },

  footer: { position: 'absolute', left: 40, right: 40, bottom: 68, gap: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { color: colors.muted, ...font.mono, fontSize: 9, letterSpacing: 2.4 },
  captionAccent: { color: colors.accent, ...font.mono, fontSize: 9, letterSpacing: 2.4 },
  progressTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: 2, backgroundColor: colors.accent },
});
