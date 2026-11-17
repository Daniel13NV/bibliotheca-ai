import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import type { Inventory, Reader, RfidStats, SecurityAlert, TagRead } from '../../api/types';
import { Badge, Button, Card, Chip, ErrorBanner, Input, Screen, SectionTitle, Stat } from '../../components/ui';
import { colors, font, radius, spacing } from '../../theme';
import { READER_ICON, timeAgo } from '../../utils/format';

/** EPC de los datos semilla, útiles para la demostración en clase. */
const DEMO_TAGS = [
  { label: 'Física (disponible)', epc: 'E004015000000065' },
  { label: 'Física (Daniel)', epc: 'E00401500000012D' },
  { label: 'Cien años (Ana)', epc: 'E004015000000515' },
];

const POLL_MS = 3000;

export default function RfidMonitorScreen() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [reads, setReads] = useState<TagRead[]>([]);
  const [stats, setStats] = useState<RfidStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simReader, setSimReader] = useState('GATE-01');
  const [simEpc, setSimEpc] = useState(DEMO_TAGS[0].epc);
  const [simulating, setSimulating] = useState(false);
  const titles = useRef<Record<string, string>>({});

  const poll = useCallback(async () => {
    try {
      const [r, rd, st, al] = await Promise.all([api.rfid.readers(), api.rfid.reads(25), api.rfid.stats(), api.catalog.alerts('OPEN')]);
      setReaders(r);
      setReads(rd);
      setStats(st);
      setAlerts(al);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  // Monitor en vivo: consulta cada 3 s mientras la pestaña está visible.
  useFocusEffect(
    useCallback(() => {
      poll();
      api.catalog.inventory().then(setInventory).catch(() => undefined);
      const timer = setInterval(poll, POLL_MS);
      return () => clearInterval(timer);
    }, [poll]),
  );

  const identify = async (epc: string) => {
    if (titles.current[epc]) return Alert.alert(epc, titles.current[epc]);
    try {
      const res = await api.catalog.lookup(epc);
      titles.current[epc] = `${res.book.title}\n${res.copy.code} · ${res.copy.location}`;
      Alert.alert(epc, titles.current[epc]);
    } catch {
      Alert.alert(epc, 'Etiqueta no registrada en el catálogo');
    }
  };

  const simulate = async () => {
    setSimulating(true);
    try {
      const res = await api.rfid.simulate(simReader, simEpc);
      if (res.accepted === 0) Alert.alert('Lectura duplicada', 'El lector ya reportó esta etiqueta hace menos de 5 s (deduplicación).');
      await poll();
    } catch (err) {
      Alert.alert('Error', errorMessage(err));
    } finally {
      setSimulating(false);
    }
  };

  const resolve = async (alert: SecurityAlert) => {
    try {
      await api.catalog.resolveAlert(alert.id, 'Revisado desde la app');
      await poll();
    } catch (err) {
      Alert.alert('Error', errorMessage(err));
    }
  };

  return (
    <Screen>
      <ErrorBanner message={error} />
      {stats && (
        <View style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: spacing.md }}>
          <Stat label="lectores en línea" value={`${stats.online}/${stats.readers}`} icon="wifi-outline" tone={stats.online === stats.readers ? 'success' : 'warning'} />
          <Stat label="lecturas (1 h)" value={stats.readsLastHour} icon="pulse-outline" tone="info" />
          <Stat label="alertas" value={alerts.length} icon="warning-outline" tone={alerts.length ? 'danger' : 'neutral'} />
        </View>
      )}

      {alerts.length > 0 && (
        <>
          <SectionTitle>🚨 Salidas no autorizadas</SectionTitle>
          {alerts.map((a) => (
            <Card key={a.id} style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
              <Text style={[font.subtitle, { color: colors.danger }]}>{a.bookTitle}</Text>
              <Text style={[font.small, { marginTop: 4 }]}>
                {a.copyCode} · {a.readerId} · {timeAgo(a.detectedAt)} · estado {a.copyStatus}
              </Text>
              <Button title="Marcar como revisada" small variant="secondary" onPress={() => resolve(a)} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
            </Card>
          ))}
        </>
      )}

      <SectionTitle>Lectores</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {readers.map((r) => (
          <View key={r.id} style={styles.reader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.dot, { backgroundColor: r.online ? colors.success : colors.danger }]} />
              <Ionicons name={READER_ICON[r.type] ?? 'radio-outline'} size={16} color={colors.ink} style={{ marginLeft: 6 }} />
              <Text style={[font.subtitle, { fontSize: 14, marginLeft: 6 }]}>{r.id}</Text>
            </View>
            <Text style={[font.small, { marginTop: 4 }]} numberOfLines={1}>
              {r.zone}
            </Text>
            <Text style={[font.small, { fontSize: 11 }]}>latido {timeAgo(r.lastHeartbeatAt)}</Text>
          </View>
        ))}
      </ScrollView>

      <SectionTitle action={<Badge label="en vivo" tone="success" icon="radio-button-on" />}>Lecturas recientes</SectionTitle>
      <Card style={{ paddingVertical: spacing.sm }}>
        {reads.length === 0 && <Text style={font.small}>Sin lecturas. Ejecuta el simulador de Node-RED o usa el panel de abajo.</Text>}
        {reads.map((r) => (
          <View key={r.id} style={styles.read}>
            <Ionicons name={READER_ICON[r.readerType ?? 'SHELF'] ?? 'radio-outline'} size={16} color={r.readerType === 'GATE' ? colors.danger : colors.inkSoft} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[styles.epc]} onPress={() => identify(r.epc)}>
                {r.epc}
              </Text>
              <Text style={[font.small, { fontSize: 11 }]}>
                {r.readerId} · {r.zone} {r.rssi !== null ? `· ${r.rssi} dBm` : ''}
              </Text>
            </View>
            <Text style={[font.small, { fontSize: 11 }]}>{timeAgo(r.readAt)}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle>Simular lectura</SectionTitle>
      <Card>
        <Text style={[font.small, { marginBottom: spacing.sm }]}>Útil para la demostración si no tienes lectores físicos.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {readers.map((r) => (
            <Chip key={r.id} label={r.id} selected={simReader === r.id} onPress={() => setSimReader(r.id)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DEMO_TAGS.map((t) => (
            <Chip key={t.epc} label={t.label} selected={simEpc === t.epc} onPress={() => setSimEpc(t.epc)} icon="pricetag-outline" />
          ))}
        </View>
        <Input label="EPC / UID" value={simEpc} onChangeText={setSimEpc} autoCapitalize="characters" />
        <Button title="Enviar lectura" icon="radio-outline" onPress={simulate} loading={simulating} disabled={!simEpc.trim()} />
      </Card>

      {inventory && (
        <>
          <SectionTitle>Inventario automático</SectionTitle>
          <Card>
            <Text style={font.body}>
              {inventory.totalCopies} ejemplares · {inventory.byStatus.AVAILABLE ?? 0} disponibles · {inventory.byStatus.ON_LOAN ?? 0} prestados
            </Text>
            <Text style={[font.small, { marginTop: 6 }]}>📍 Mal ubicados: {inventory.misplaced.length}</Text>
            {inventory.misplaced.slice(0, 5).map((c) => (
              <Text key={c.id} style={[font.small, { marginLeft: spacing.md }]}>
                • {c.code}: va en {c.zone}, detectado en {c.lastSeenZone}
              </Text>
            ))}
            <Text style={[font.small, { marginTop: 4 }]}>
              👀 Sin lectura en {inventory.notSeenRecently.hours} h: {inventory.notSeenRecently.count}
            </Text>
            <Text style={[font.small, { marginTop: 4 }]}>🏷️ Sin etiqueta RFID: {inventory.untagged.count}</Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reader: {
    width: 170,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  read: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  epc: { fontFamily: 'monospace', fontSize: 13, color: colors.info, textDecorationLine: 'underline' },
});
