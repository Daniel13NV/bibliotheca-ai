import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { CopyLookup } from '../api/types';
import { BookCover } from '../components/BookCard';
import { Badge, Button, Card, ErrorBanner, Input, Loading, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRootNavigation } from '../navigation/hooks';
import { nfcAvailability, NfcAvailability, readTagUid } from '../services/nfc';
import { colors, font, radius, spacing } from '../theme';
import { COPY_STATUS, formatDate, money } from '../utils/format';

type Mode = 'qr' | 'nfc' | 'manual';

/**
 * Identifica un ejemplar físico (QR, etiqueta RFID por NFC o código) y permite:
 *  - Estudiante: autopréstamo.
 *  - Personal: prestar a una matrícula, registrar devolución y asignar la etiqueta RFID.
 */
export default function ScanScreen() {
  const nav = useRootNavigation();
  const focused = useIsFocused();
  const { isStaff } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>(Platform.OS === 'web' ? 'manual' : 'qr');
  const [nfc, setNfc] = useState<NfcAvailability>('unsupported');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<CopyLookup | null>(null);
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');
  const lastScan = useRef<{ value: string; at: number } | null>(null);

  useEffect(() => {
    nfcAvailability().then(setNfc);
  }, []);

  const lookup = async (ref: string) => {
    const value = ref.trim();
    if (!value) return;
    setError(null);
    setLooking(true);
    try {
      setResult(await api.catalog.lookup(value));
    } catch (err) {
      setResult(null);
      setError(errorMessage(err));
    } finally {
      setLooking(false);
    }
  };

  const onBarcode = ({ data }: { data: string }) => {
    const now = Date.now();
    if (result || looking) return;
    if (lastScan.current && lastScan.current.value === data && now - lastScan.current.at < 3000) return;
    lastScan.current = { value: data, at: now };
    lookup(data);
  };

  const scanNfc = async () => {
    setError(null);
    try {
      const uid = await readTagUid();
      await lookup(uid);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    try {
      await action();
    } catch (err) {
      Alert.alert('No se pudo completar', errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const refreshResult = async () => {
    if (result) setResult(await api.catalog.lookup(result.copy.code));
  };

  const checkout = () =>
    run('checkout', async () => {
      const loan = await api.loans.checkout(result!.copy.code, isStaff ? studentId.trim() || undefined : undefined);
      Alert.alert('📚 Préstamo registrado', `${loan.bookTitle}\nPrestado a: ${loan.userName}\nFecha límite: ${formatDate(loan.dueDate)}`);
      setStudentId('');
      await refreshResult();
    });

  const giveBack = () =>
    run('return', async () => {
      const res = await api.loans.giveBack(result!.copy.code);
      Alert.alert(
        '✅ Devolución registrada',
        res.penalty
          ? `Entregado con ${res.penalty.daysLate} día(s) de atraso.\nMulta generada: ${money(res.penalty.amount)}`
          : 'Entregado a tiempo. ¡Sin multa!',
      );
      await refreshResult();
    });

  const assignTag = () =>
    run('tag', async () => {
      const uid = await readTagUid();
      const copy = await api.catalog.assignTag(result!.copy.id, uid);
      Alert.alert('🏷️ Etiqueta asignada', `${copy.code} ahora se rastrea con la etiqueta ${copy.rfidEpc}`);
      await refreshResult();
    });

  const reset = () => {
    setResult(null);
    setError(null);
    lastScan.current = null;
  };

  // ------------------------------------------------------------------ Resultado
  if (result) {
    const { copy, book } = result;
    const status = COPY_STATUS[copy.status];
    return (
      <Screen>
        <Card>
          <View style={{ flexDirection: 'row' }}>
            <BookCover title={book.title} category={book.category} size={60} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={font.subtitle}>{book.title}</Text>
              <Text style={[font.small, { marginVertical: 4 }]}>{book.authors.join(', ')}</Text>
              <Badge label={status.label} tone={status.tone} />
            </View>
          </View>
          <View style={styles.meta}>
            <MetaRow icon="barcode-outline" label="Ejemplar" value={copy.code} />
            <MetaRow icon="location-outline" label="Ubicación" value={copy.location} />
            <MetaRow icon="radio-outline" label="Etiqueta RFID" value={copy.rfidEpc ?? 'Sin etiqueta'} />
          </View>
          <Button title="Ver ficha del libro" variant="ghost" icon="book-outline" small onPress={() => nav.navigate('BookDetail', { bookId: book.id, title: book.title })} />
        </Card>

        {!isStaff && copy.status === 'AVAILABLE' && (
          <Button title="Pedir prestado" icon="bookmark" onPress={checkout} loading={busy === 'checkout'} />
        )}
        {!isStaff && copy.status !== 'AVAILABLE' && (
          <Card style={{ backgroundColor: colors.warningSoft }}>
            <Text style={[font.body, { color: colors.warning }]}>
              Este ejemplar no está disponible para autopréstamo. Acércate al mostrador si crees que es un error.
            </Text>
          </Card>
        )}

        {isStaff && (
          <Card>
            <Text style={font.subtitle}>Circulación</Text>
            {copy.status === 'AVAILABLE' && (
              <>
                <Input
                  label="Matrícula del estudiante"
                  value={studentId}
                  onChangeText={setStudentId}
                  autoCapitalize="characters"
                  placeholder="A00067890"
                  style={{ marginTop: spacing.sm }}
                />
                <Button title="Prestar a esta matrícula" icon="arrow-forward-circle-outline" onPress={checkout} loading={busy === 'checkout'} disabled={!studentId.trim()} />
              </>
            )}
            {copy.status === 'ON_LOAN' && (
              <Button title="Registrar devolución" icon="return-down-back-outline" onPress={giveBack} loading={busy === 'return'} style={{ marginTop: spacing.sm }} />
            )}
            <Button
              title={nfc === 'ready' ? 'Asignar etiqueta RFID (NFC)' : 'Asignar etiqueta: requiere NFC'}
              icon="pricetag-outline"
              variant="secondary"
              onPress={assignTag}
              loading={busy === 'tag'}
              disabled={nfc !== 'ready'}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        )}

        <Button title="Escanear otro libro" variant="secondary" icon="scan-outline" onPress={reset} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }

  // ------------------------------------------------------------------ Escáner
  return (
    <Screen scroll={mode !== 'qr'}>
      <View style={styles.modes}>
        <ModeButton icon="qr-code-outline" label="QR" active={mode === 'qr'} onPress={() => setMode('qr')} disabled={Platform.OS === 'web'} />
        <ModeButton icon="radio-outline" label="NFC / RFID" active={mode === 'nfc'} onPress={() => setMode('nfc')} />
        <ModeButton icon="keypad-outline" label="Código" active={mode === 'manual'} onPress={() => setMode('manual')} />
      </View>
      <ErrorBanner message={error} />
      {looking && <Loading label="Identificando ejemplar…" />}

      {mode === 'qr' && !looking && (
        <View style={{ flex: 1 }}>
          {!permission ? (
            <Loading />
          ) : !permission.granted ? (
            <Card>
              <Text style={font.body}>Necesitamos la cámara para leer el código QR pegado en cada libro.</Text>
              <Button title="Permitir cámara" icon="camera-outline" onPress={requestPermission} style={{ marginTop: spacing.md }} />
            </Card>
          ) : focused ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13'] }}
                onBarcodeScanned={onBarcode}
              />
              <View style={styles.frame} />
              <Text style={styles.cameraHint}>Apunta al código QR del ejemplar (BIB-00101…)</Text>
            </View>
          ) : null}
        </View>
      )}

      {mode === 'nfc' && !looking && (
        <Card style={{ alignItems: 'center' }}>
          <Ionicons name="radio" size={56} color={nfc === 'ready' ? colors.gold : colors.muted} />
          <Text style={[font.subtitle, { marginTop: spacing.md, textAlign: 'center' }]}>
            {nfc === 'ready' ? 'Acerca la etiqueta RFID del libro' : nfc === 'disabled' ? 'Activa NFC en tu teléfono' : 'NFC no disponible'}
          </Text>
          <Text style={[font.small, { textAlign: 'center', marginVertical: spacing.md }]}>
            {nfc === 'unsupported'
              ? 'Las etiquetas de biblioteca (ISO 15693) se leen con el NFC del celular en una compilación propia (npx expo run:android). En Expo Go usa el QR o el código.'
              : 'Las etiquetas HF de biblioteca se leen a 2–4 cm de la parte trasera del teléfono.'}
          </Text>
          <Button title="Leer etiqueta" icon="scan-circle-outline" onPress={scanNfc} disabled={nfc !== 'ready'} />
        </Card>
      )}

      {mode === 'manual' && !looking && (
        <Card>
          <Input
            label="Código del ejemplar o UID RFID"
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            placeholder="BIB-00101 o E004015000000065"
            onSubmitEditing={() => lookup(manualCode)}
          />
          <Button title="Buscar ejemplar" icon="search" onPress={() => lookup(manualCode)} disabled={!manualCode.trim()} />
          <Text style={[font.small, { marginTop: spacing.md }]}>
            Prueba con BIB-00101 (disponible) o BIB-00301 (prestado a Daniel).
          </Text>
        </Card>
      )}
    </Screen>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <Text style={[font.small, { width: 92, marginLeft: 6 }]}>{label}</Text>
      <Text style={[font.body, { flex: 1, fontSize: 14 }]}>{value}</Text>
    </View>
  );
}

function ModeButton({
  icon,
  label,
  active,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.modeBtn, active && styles.modeActive, disabled && { opacity: 0.4 }]}>
      <Ionicons name={icon} size={18} color={active ? colors.white : colors.ink} />
      <Text style={[styles.modeText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.sm },
  modeActive: { backgroundColor: colors.ink },
  modeText: { marginLeft: 6, fontWeight: '600', color: colors.ink },
  cameraWrap: { flex: 1, minHeight: 380, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 230, height: 230, borderWidth: 3, borderColor: colors.gold, borderRadius: 18 },
  cameraHint: { position: 'absolute', bottom: 20, color: colors.white, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  meta: { marginTop: spacing.md, marginBottom: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});
