import { Platform } from 'react-native';

/**
 * Identidad visual de Bibliotheca: tinta azul, oro de los lomos y papel.
 * El "material" de la app son libros encuadernados en tela, así que cada tema
 * tiene su propio color de tela (ver CLOTH) y los títulos usan una serif de imprenta.
 */
export const colors = {
  ink: '#1F2A44',
  inkDeep: '#152036',
  inkSoft: '#2E3B5C',
  inkMuted: '#8D96AD',
  gold: '#C8963E',
  goldLight: '#E9CF9C',
  goldSoft: '#F3E6CC',
  paper: '#F7F4EE',
  card: '#FFFDF8',
  wood: '#6B4E3D',
  woodDark: '#4A3528',
  text: '#1B1B1F',
  muted: '#6B6B76',
  border: '#E6E1D6',
  success: '#2E7D5B',
  successSoft: '#E3F2EA',
  warning: '#B7791F',
  warningSoft: '#FBF0DC',
  danger: '#B03A2E',
  dangerSoft: '#FBE5E2',
  info: '#2B6CB0',
  infoSoft: '#E3EEF9',
  white: '#FFFFFF',
};

/** Color de la tela de encuadernación según el tema del libro. */
export const CLOTH: Record<string, string> = {
  Física: '#24476B',
  Astronomía: '#1C3456',
  Biología: '#2F5D50',
  Química: '#3D6B5B',
  Matemáticas: '#54457A',
  Literatura: '#7A3B3B',
  Ensayo: '#8A5A3B',
  Programación: '#2E3B5C',
  'Inteligencia Artificial': '#4A3F70',
  Historia: '#6B4E3D',
  Filosofía: '#5E4B3C',
  Psicología: '#7D5A3A',
  Economía: '#3F5E7A',
};

const FALLBACK_CLOTH = ['#24476B', '#7A3B3B', '#2F5D50', '#54457A', '#6B4E3D', '#3F5E7A'];

export function clothFor(category: string): string {
  if (CLOTH[category]) return CLOTH[category];
  let hash = 0;
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_CLOTH[hash % FALLBACK_CLOTH.length];
}

/** Ícono representativo de cada tema. */
export const CATEGORY_ICON: Record<string, string> = {
  Física: 'planet-outline',
  Astronomía: 'telescope-outline',
  Biología: 'leaf-outline',
  Química: 'flask-outline',
  Matemáticas: 'calculator-outline',
  Literatura: 'book-outline',
  Ensayo: 'create-outline',
  Programación: 'code-slash-outline',
  'Inteligencia Artificial': 'sparkles-outline',
  Historia: 'hourglass-outline',
  Filosofía: 'bulb-outline',
  Psicología: 'heart-outline',
  Economía: 'trending-up-outline',
};

/** Serif de imprenta del sistema (Georgia en iOS/web, Noto Serif en Android). */
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 6, md: 12, lg: 16, pill: 999 };

export const font = {
  display: { fontFamily: serif, fontSize: 30, lineHeight: 36, color: colors.ink },
  title: { fontFamily: serif, fontSize: 24, lineHeight: 30, color: colors.ink },
  subtitle: { fontFamily: serif, fontSize: 18, lineHeight: 24, color: colors.ink },
  body: { fontSize: 15, color: colors.text, lineHeight: 22 },
  reading: { fontFamily: serif, fontSize: 16, color: colors.text, lineHeight: 26 },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  caption: { fontSize: 12, color: colors.muted, fontWeight: '600' as const },
};

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

export const toneColors: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  neutral: { bg: '#EFEDE8', fg: colors.muted },
  gold: { bg: colors.goldSoft, fg: '#8A6420' },
};
