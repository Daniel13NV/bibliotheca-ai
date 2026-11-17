import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { AppNotification } from '../api/types';
import { Button, Card, EmptyState, ErrorBanner, Loading, Screen } from '../components/ui';
import { colors, font, spacing } from '../theme';
import { timeAgo } from '../utils/format';

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.notifications.mine();
      setItems(res.items);
      setUnread(res.unread);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!items && !error) return <Loading />;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    >
      <ErrorBanner message={error} onRetry={load} />
      {unread > 0 && (
        <Button
          title={`Marcar ${unread} como leídas`}
          small
          variant="secondary"
          icon="checkmark-done"
          onPress={async () => {
            await api.notifications.readAll();
            await load();
          }}
          style={{ marginBottom: spacing.md, alignSelf: 'flex-start' }}
        />
      )}
      {items?.length === 0 && <EmptyState icon="notifications-off-outline" title="Sin notificaciones" message="Aquí verás préstamos, recordatorios y multas." />}
      {items?.map((n) => (
        <Card key={n.id} style={!n.read ? { borderLeftWidth: 4, borderLeftColor: colors.gold } : undefined}>
          <Text style={font.subtitle}>{n.title}</Text>
          <Text style={[font.body, { marginTop: 4 }]}>{n.body}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
            <Ionicons name={n.channel === 'TELEGRAM' ? 'paper-plane-outline' : 'phone-portrait-outline'} size={13} color={colors.muted} />
            <Text style={[font.small, { marginLeft: 4 }]}>
              {timeAgo(n.createdAt)} · {n.channel === 'TELEGRAM' ? (n.status === 'SENT' ? 'enviada por Telegram' : `Telegram: ${n.status.toLowerCase()}`) : 'solo en la app'}
            </Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
