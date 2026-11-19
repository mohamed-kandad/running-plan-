/**
 * Design tokens — Stride.
 *
 * One neon lime accent on near-black. Lime is reserved for the primary CTA,
 * the single hero metric on a screen, the active tab, progress fills, charts
 * and badges. Everything else is a neutral surface or a muted label.
 */

export const colors = {
  // Surfaces
  bg: '#0D0F12',
  surface: '#1A1D22',
  surfaceAlt: '#1F2329',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)',

  // Text
  text: '#FFFFFF',
  muted: '#8A8F98',
  faint: '#6B7280',

  // Accent
  accent: '#D4FF00',
  accentInk: '#0D0F12',
  accentTint: 'rgba(212,255,0,0.10)',
  accentTintStrong: 'rgba(212,255,0,0.16)',
  stripe: 'rgba(60,80,0,0.07)',

  // Data colours (workout types, zones)
  blue: '#64C8F5',
  green: '#4CD964',
  orange: '#FF8547',
  lime: '#D4FF00',
  violet: '#B79CFF',
};

export const radius = {
  sm: 12,
  md: 20,
  lg: 24,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

/** Layout constants so every screen breathes the same way. */
export const layout = {
  screenPadding: 20,
  cardGap: 14,
  sectionGap: 24,
  cardPadding: 18,
  buttonHeight: 56,
};

export const font = {
  // Space Grotesk — display, big numbers, screen titles
  hero: { fontFamily: 'SpaceGrotesk-Bold', fontWeight: '700' as const, fontSize: 64, letterSpacing: -2 },
  display: { fontFamily: 'SpaceGrotesk-Bold', fontWeight: '700' as const, fontSize: 52, letterSpacing: -1.5 },
  h1: { fontFamily: 'SpaceGrotesk-Bold', fontWeight: '700' as const, fontSize: 28, letterSpacing: -0.5 },
  h2: { fontFamily: 'SpaceGrotesk-Bold', fontWeight: '700' as const, fontSize: 20, letterSpacing: -0.3 },
  stat: { fontFamily: 'SpaceGrotesk-Bold', fontWeight: '700' as const, fontSize: 36, letterSpacing: -0.8 },

  // Archivo Black Italic — hero CTA words and workout names
  heroTitle: {
    fontFamily: 'ArchivoBlack-Italic',
    fontWeight: '900' as const,
    fontSize: 44,
    letterSpacing: -0.5,
    textTransform: 'uppercase' as const,
  },
  heroTitleSm: {
    fontFamily: 'ArchivoBlack-Italic',
    fontWeight: '900' as const,
    fontSize: 24,
    letterSpacing: -0.2,
    textTransform: 'uppercase' as const,
  },

  // Inter — body and labels
  body: { fontFamily: 'Inter-Medium', fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  small: { fontFamily: 'Inter-Medium', fontSize: 13, fontWeight: '500' as const },
  label: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500' as const,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  tiny: { fontFamily: 'Inter-Medium', fontWeight: '600' as const, fontSize: 11, letterSpacing: 0.6 },

  // JetBrains Mono — timestamps, tags, small data
  mono: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 0.3 },
  monoBold: { fontFamily: 'JetBrainsMono-Bold', fontSize: 11, letterSpacing: 0.2 },
};
