import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { TelegramLinkCode } from '../api/types';
import { Button, Card, Screen, SectionTitle } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRootNavigation } from '../navigation/hooks';
import { colors, font, radius, serif, spacing } from '../theme';
import { formatDate } from '../utils/format';

const ROLE_LABEL = { STUDENT: 'Lector', LIBRARIAN: 'Personal de biblioteca', ADMIN: 'Dirección' } as const;
/** Anchos de las barras del código de la credencial (decorativo). */
const BARS = [2, 1, 3, 1, 1, 2, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3];

export default function ProfileScreen() {
  const nav = useRootNavigation();
  const { user, logout, refresh, serverUrl, isStaff } = useAuth();
  const [link, setLink] = useState<TelegramLinkCode | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [health, setHealth] = useState<Array<{ service: string; status: string }> | null>(null);

  if (!user) return null;
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      Alert.alert('Error', errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      {/* Credencial de lector */}
      <View style={styles.libraryCard}>
        <View style={styles.cardTop}>
          <Text style={styles.cardBrand}>Bibliotheca</Text>
          <Text style={styles.cardRole}>{ROLE_LABEL[user.role]}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.cardName}>{user.name}</Text>
            <Text style={styles.cardEmail}>{user.email}</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.cardLabel}>Matrícula</Text>
            <Text style={styles.cardId}>{user.studentId ?? 'Sin matrícula'}</Text>
          </View>
          <View style={styles.barcode}>
            {BARS.map((w, i) => (
              <View key={i} style={{ width: w, height: 30, backgroundColor: i % 2 ? 'transparent' : colors.goldLight, marginRight: 1 }} />
            ))}
          </View>
        </View>
      </View>

      {/* ------------------------------ Telegram ------------------------------ */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="paper-plane" size={20} color={colors.info} />
          <Text style={[font.subtitle, { marginLeft: 8 }]}>Bot de Telegram</Text>
        </View>
        {user.telegramLinked ? (
          <>
            <Text style={[font.body, { marginTop: spacing.sm }]}>
              ✅ Vinculado{user.telegramUsername ? ` como @${user.telegramUsername}` : ''}. Recibirás recordatorios y podrás renovar con un clic.
            </Text>
            <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
              <Button
                title="Probar notificación"
                small
                variant="secondary"
                icon="notifications-outline"
                loading={busy === 'test'}
                onPress={() =>
                  run('test', async () => {
                    const n = await api.notifications.test();
                    Alert.alert('Notificación enviada', n.status === 'SENT' ? 'Revisa tu Telegram 📱' : `Estado: ${n.status}`);
                  })
                }
              />
              <Button
                title="Desvincular"
                small
                variant="ghost"
                loading={busy === 'unlink'}
                onPress={() =>
                  run('unlink', async () => {
                    await api.users.telegramUnlink();
                    await refresh();
                  })
                }
                style={{ marginLeft: spacing.sm }}
              />
            </View>
          </>
        ) : link ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={font.small}>Envía este código al bot (vence {formatDate(link.expiresAt, true)}):</Text>
            <Text style={styles.code}>{link.code}</Text>
            <Button title={`Abrir @${link.botUsername}`} icon="open-outline" onPress={() => Linking.openURL(link.deepLink)} />
            <Text style={[font.small, { marginTop: spacing.sm }]}>{link.instructions}</Text>
            <Button
              title="Ya lo envié"
              small
              variant="ghost"
              onPress={() =>
                run('check', async () => {
                  await refresh();
                  setLink(null);
                })
              }
            />
          </View>
        ) : (
          <>
            <Text style={[font.body, { marginTop: spacing.sm }]}>
              Consulta disponibilidad, renueva préstamos y recibe recordatorios de devolución desde Telegram.
            </Text>
            <Button
              title="Vincular Telegram"
              icon="link-outline"
              loading={busy === 'link'}
              onPress={() => run('link', async () => setLink(await api.users.telegramLink()))}
              style={{ marginTop: spacing.md }}
            />
          </>
        )}
      </Card>

      <SectionTitle>Cuenta</SectionTitle>
      <Card style={{ paddingVertical: spacing.sm }}>
        <Row icon="notifications-outline" label="Notificaciones" onPress={() => nav.navigate('Notifications')} />
        {isStaff && <Row icon="add-circle-outline" label="Registrar libro nuevo" onPress={() => nav.navigate('AddBook')} />}
        <Row
          icon="pulse-outline"
          label="Estado del sistema"
          onPress={() =>
            run('health', async () => {
              setHealth((await api.health()).services);
            })
          }
        />
        {health && (
          <View style={{ paddingVertical: spacing.sm }}>
            {health.map((s) => (
              <Text key={s.service} style={font.small}>
                {s.status === 'up' ? '🟢' : '🔴'} {s.service}
              </Text>
            ))}
          </View>
        )}
      </Card>

      <Text style={[font.small, { textAlign: 'center', marginVertical: spacing.md }]}>Servidor: {serverUrl}</Text>
      <Button title="Cerrar sesión" variant="danger" icon="log-out-outline" onPress={logout} />
    </Screen>
  );
}

function Row({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Text onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.ink} />
      {'  '}
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  libraryCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { fontFamily: serif, color: colors.goldLight, fontSize: 18 },
  cardRole: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.goldLight, fontSize: 20, fontWeight: '800' },
  cardName: { fontFamily: serif, color: colors.white, fontSize: 21, lineHeight: 26 },
  cardEmail: { color: '#C9D1E3', fontSize: 13, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.xl },
  cardLabel: { color: colors.inkMuted, fontSize: 11 },
  cardId: { color: colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  barcode: { flexDirection: 'row', alignItems: 'flex-end' },
  code: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.ink,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginVertical: spacing.md,
  },
  row: { fontSize: 15, color: colors.ink, paddingVertical: 12 },
});
