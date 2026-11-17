import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { Loan, LoanStats, MyLoans, Penalty } from '../api/types';
import { Badge, Button, Card, Chip, EmptyState, ErrorBanner, Loading, Screen, SectionTitle, Stat } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRootNavigation } from '../navigation/hooks';
import { colors, font, spacing } from '../theme';
import { dueText, formatDate, LOAN_STATUS, money } from '../utils/format';

export default function LoansScreen() {
  const { isStaff } = useAuth();
  return isStaff ? <StaffLoans /> : <StudentLoans />;
}

function LoanCard({ loan, actions, showUser }: { loan: Loan; actions?: React.ReactNode; showUser?: boolean }) {
  const nav = useRootNavigation();
  const status = LOAN_STATUS[loan.status];
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={[font.subtitle, { flex: 1, marginRight: spacing.sm }]} onPress={() => nav.navigate('BookDetail', { bookId: loan.bookId, title: loan.bookTitle })}>
          {loan.bookTitle}
        </Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {showUser && (
        <Text style={[font.small, { marginTop: 4 }]}>
          <Ionicons name="person-outline" size={12} /> {loan.userName}
        </Text>
      )}
      <Text style={[font.small, { marginTop: 4 }]}>
        {loan.copyCode} · prestado {formatDate(loan.loanedAt)}
      </Text>
      {loan.status !== 'RETURNED' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
          <Ionicons name="calendar-outline" size={15} color={status.tone === 'danger' ? colors.danger : colors.inkSoft} />
          <Text style={[font.body, { marginLeft: 6, color: status.tone === 'danger' ? colors.danger : colors.inkSoft }]}>
            {dueText(loan.status, loan.daysUntilDue)} · {formatDate(loan.dueDate)}
          </Text>
        </View>
      ) : (
        <Text style={[font.small, { marginTop: spacing.sm }]}>
          Devuelto {formatDate(loan.returnedAt)}
          {loan.returnChannel === 'RFID_RETURN_BOX' ? ' en el buzón inteligente' : ''}
        </Text>
      )}
      {loan.accruedFine > 0 && <Text style={{ color: colors.danger, marginTop: 4, fontWeight: '600' }}>Multa acumulada: {money(loan.accruedFine)}</Text>}
      {actions}
    </Card>
  );
}

function StudentLoans() {
  const [data, setData] = useState<MyLoans | null>(null);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [history, setHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renewing, setRenewing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [loans, pen] = await Promise.all([api.loans.mine(history), api.penalties.mine()]);
      setData(loans);
      setPenalties(pen.penalties);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [history]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const renew = async (loan: Loan) => {
    setRenewing(loan.id);
    try {
      const updated = await api.loans.renew(loan.id);
      Alert.alert('🔄 Préstamo renovado', `Nueva fecha límite: ${formatDate(updated.dueDate)}`);
      await load();
    } catch (err) {
      Alert.alert('No se pudo renovar', errorMessage(err));
    } finally {
      setRenewing(null);
    }
  };

  if (!data && !error) return <Loading label="Cargando tus préstamos…" />;
  const s = data?.summary;
  const pending = penalties.filter((p) => p.status === 'PENDING');

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
      {s && (
        <View style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: spacing.md }}>
          <Stat label={`de ${s.maxActiveLoans} activos`} value={s.active} icon="book-outline" tone="info" />
          <Stat label="por vencer" value={s.dueSoon} icon="time-outline" tone="warning" />
          <Stat label="multas" value={money(s.pendingPenalties, s.currency)} icon="cash-outline" tone={s.pendingPenalties > 0 ? 'danger' : 'success'} />
        </View>
      )}

      <View style={{ flexDirection: 'row' }}>
        <Chip label="Activos" selected={!history} onPress={() => setHistory(false)} />
        <Chip label="Historial" selected={history} onPress={() => setHistory(true)} />
      </View>

      {data?.loans.length === 0 && <EmptyState icon="bookmarks-outline" title="Sin préstamos" message="Escanea un libro disponible para llevártelo." />}
      {data?.loans.map((loan) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          actions={
            loan.status !== 'RETURNED' ? (
              <Button
                title={loan.renewalsLeft > 0 ? `Renovar (${loan.renewalsLeft} disponibles)` : 'Sin renovaciones'}
                small
                variant="secondary"
                icon="refresh"
                onPress={() => renew(loan)}
                loading={renewing === loan.id}
                disabled={loan.renewalsLeft === 0 || loan.status === 'OVERDUE'}
                style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
              />
            ) : null
          }
        />
      ))}

      {pending.length > 0 && (
        <>
          <SectionTitle>Multas pendientes</SectionTitle>
          {pending.map((p) => (
            <Card key={p.id} style={{ backgroundColor: colors.dangerSoft }}>
              <Text style={[font.subtitle, { fontSize: 15 }]}>{p.bookTitle}</Text>
              <Text style={[font.body, { color: colors.danger, marginTop: 4 }]}>
                {money(p.amount)} · {p.daysLate} día(s) de atraso
              </Text>
              <Text style={[font.small, { marginTop: 4 }]}>Págala en el mostrador para poder pedir y renovar libros.</Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

type StaffFilter = 'ACTIVE' | 'OVERDUE' | 'RETURNED';

function StaffLoans() {
  const [filter, setFilter] = useState<StaffFilter>('ACTIVE');
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, st, pen] = await Promise.all([api.loans.list(filter), api.loans.stats(), api.penalties.list('PENDING')]);
      setLoans(list);
      setStats(st);
      setPenalties(pen);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const act = async (id: string, fn: () => Promise<string>) => {
    setBusy(id);
    try {
      Alert.alert('Listo', await fn());
      await load();
    } catch (err) {
      Alert.alert('Error', errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

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
      {stats && (
        <>
          <View style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: spacing.sm }}>
            <Stat label="activos" value={stats.activeLoans} icon="book-outline" tone="info" />
            <Stat label="vencidos" value={stats.overdueLoans} icon="alert-circle-outline" tone="danger" />
            <Stat label="por vencer" value={stats.dueSoon} icon="time-outline" tone="warning" />
          </View>
          <View style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: spacing.md }}>
            <Stat label="préstamos hoy" value={stats.loanedToday} icon="arrow-up-circle-outline" tone="gold" />
            <Stat label="devoluciones hoy" value={stats.returnedToday} icon="arrow-down-circle-outline" tone="success" />
            <Stat label="por cobrar" value={money(stats.pendingPenalties.total, stats.currency)} icon="cash-outline" tone="neutral" />
          </View>
        </>
      )}
      <Button
        title="Enviar recordatorios ahora (Telegram)"
        icon="paper-plane-outline"
        variant="gold"
        small
        loading={busy === 'reminders'}
        onPress={() =>
          act('reminders', async () => {
            const r = await api.loans.reminders();
            return `Se enviaron ${r.dueSoon} recordatorios de vencimiento y ${r.overdue} avisos de atraso.`;
          })
        }
        style={{ marginBottom: spacing.md }}
      />

      <View style={{ flexDirection: 'row' }}>
        <Chip label="Activos" selected={filter === 'ACTIVE'} onPress={() => setFilter('ACTIVE')} />
        <Chip label="Vencidos" selected={filter === 'OVERDUE'} onPress={() => setFilter('OVERDUE')} />
        <Chip label="Devueltos" selected={filter === 'RETURNED'} onPress={() => setFilter('RETURNED')} />
      </View>

      {!loans && !error && <Loading />}
      {loans?.length === 0 && <EmptyState icon="checkmark-done-outline" title="Nada por aquí" />}
      {loans?.map((loan) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          showUser
          actions={
            loan.status !== 'RETURNED' ? (
              <Button
                title="Registrar devolución"
                small
                variant="secondary"
                icon="return-down-back-outline"
                loading={busy === loan.id}
                onPress={() =>
                  act(loan.id, async () => {
                    const r = await api.loans.giveBackById(loan.id);
                    return r.penalty ? `Devuelto con atraso. Multa: ${money(r.penalty.amount)}` : 'Devuelto a tiempo.';
                  })
                }
                style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
              />
            ) : null
          }
        />
      ))}

      <SectionTitle>Multas por cobrar</SectionTitle>
      {penalties.length === 0 && <Text style={font.small}>No hay multas pendientes.</Text>}
      {penalties.map((p) => (
        <Card key={p.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[font.subtitle, { fontSize: 15, flex: 1 }]}>{p.userName}</Text>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>{money(p.amount)}</Text>
          </View>
          <Text style={[font.small, { marginTop: 4 }]}>
            {p.bookTitle} · {p.daysLate} día(s) de atraso
          </Text>
          <Button
            title="Marcar como pagada"
            small
            icon="cash-outline"
            loading={busy === p.id}
            onPress={() =>
              act(p.id, async () => {
                await api.penalties.pay(p.id);
                return 'Pago registrado. El estudiante recibirá la confirmación.';
              })
            }
            style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
          />
        </Card>
      ))}
    </Screen>
  );
}
