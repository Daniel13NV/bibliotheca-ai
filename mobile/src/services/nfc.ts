import { Platform } from 'react-native';

/**
 * Lectura de etiquetas RFID de biblioteca con el NFC del celular.
 * Las bibliotecas usan etiquetas HF ISO 15693 (NfcV), que los teléfonos Android pueden leer.
 *
 * react-native-nfc-manager es un módulo nativo: funciona en una compilación propia
 * (npx expo run:android) pero NO dentro de Expo Go. Por eso se carga de forma perezosa
 * y la app sigue funcionando (con QR o código manual) si no está disponible.
 */
type NfcModule = {
  default: {
    isSupported: () => Promise<boolean>;
    start: () => Promise<void>;
    isEnabled: () => Promise<boolean>;
    requestTechnology: (tech: string[] | string, options?: { alertMessage?: string }) => Promise<unknown>;
    getTag: () => Promise<{ id?: string; techTypes?: string[] } | null>;
    cancelTechnologyRequest: () => Promise<void>;
  };
  NfcTech: Record<string, string>;
};

let cached: NfcModule | null | undefined;

function load(): NfcModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web') return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('react-native-nfc-manager') as NfcModule;
  } catch {
    cached = null;
  }
  return cached;
}

export type NfcAvailability = 'ready' | 'disabled' | 'unsupported';

export async function nfcAvailability(): Promise<NfcAvailability> {
  const mod = load();
  if (!mod?.default) return 'unsupported';
  try {
    if (!(await mod.default.isSupported())) return 'unsupported';
    await mod.default.start();
    return (await mod.default.isEnabled()) ? 'ready' : 'disabled';
  } catch {
    return 'unsupported'; // típico en Expo Go: el módulo nativo no existe
  }
}

/**
 * Android entrega el UID de ISO 15693 en orden inverso (LSB primero).
 * Las bibliotecas lo imprimen empezando con E0, así que lo normalizamos.
 */
export function normalizeUid(raw: string): string {
  const hex = raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hex.length === 16 && hex.endsWith('E0') && !hex.startsWith('E0')) {
    return (hex.match(/../g) ?? []).reverse().join('');
  }
  return hex;
}

export async function readTagUid(): Promise<string> {
  const mod = load();
  if (!mod?.default) throw new Error('NFC no disponible en esta compilación');
  const { NfcTech } = mod;
  try {
    await mod.default.requestTechnology(
      [NfcTech.NfcV, NfcTech.NfcA, NfcTech.IsoDep, NfcTech.Ndef].filter(Boolean),
      { alertMessage: 'Acerca la etiqueta del libro al teléfono' },
    );
    const tag = await mod.default.getTag();
    if (!tag?.id) throw new Error('No se pudo leer el identificador de la etiqueta');
    return normalizeUid(tag.id);
  } finally {
    mod.default.cancelTechnologyRequest().catch(() => undefined);
  }
}
