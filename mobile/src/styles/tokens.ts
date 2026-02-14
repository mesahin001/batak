/**
 * Batak Tournament - Design Tokens (Mobile)
 * Phase 1: Visual Foundation
 * React Native / Expo compatible
 */

export const COLORS = {
  // Felt Theme
  feltDark: '#0d2818',
  feltBase: '#1a472a',
  feltLight: '#2d5a3d',
  feltAccent: '#3d6b4a',

  // Gold
  goldPrimary: '#d4af37',
  goldLight: '#f4e5c3',
  goldDark: '#b8941e',

  // Cards
  cardBg: '#ffffff',
  cardBorder: '#e5e7eb',

  // Semantic
  primary: '#d4af37',
  danger: '#ef4444',
  success: '#4ade80',
  warning: '#fbbf24',
  info: '#60a5fa',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',

  // Suits
  spades: '#1e293b',
  hearts: '#dc2626',
  diamonds: '#d97706',
  clubs: '#15803d',
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  glow: {
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  glowSm: {
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

export const TYPOGRAPHY = {
  fontSans: 'System',
  fontSerif: 'Georgia',
} as const;

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  card: 8,
} as const;
