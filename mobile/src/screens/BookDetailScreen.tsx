import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { BookDetail, ChatTurn, Copy, SummaryLevel } from '../api/types';
import { useRequireAuth } from '../components/AuthGate';
import { BookCover } from '../components/BookCard';
import { Badge, Button, Card, Chip, ErrorBanner, Input, Loading, MarkdownText, SectionTitle } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootScreenProps } from '../navigation/types';
import { clothFor, colors, font, radius, serif, spacing } from '../theme';
import { COPY_STATUS, formatDate, timeAgo } from '../utils/format';

const LEVELS: Array<{ key: SummaryLevel; label: string }> = [
  { key: 'breve', label: 'Breve' },
  { key: 'detallado', label: 'Detallado' },
  { key: 'principiante', label: 'Para principiantes' },
];

const where = (c: Copy) => `${c.zone}, estante ${c.shelf}`;

export default function BookDetailScreen({ route }: RootScreenProps<'BookDetail'>) {
  const { bookId } = route.params;
  const { user, isStaff } = useAuth();
  const requireAuth = useRequireAuth();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [borrowing, setBorrowing] = useState<string | null>(null);

  const [level, setLevel] = useState<SummaryLevel>('breve');
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [qa, setQa] = useState<ChatTurn[]>([]);
  const [asking, setAsking] = useState(false);

  const [newCopy, setNewCopy] = useState({ zone: '', shelf: '' });
  const [addingCopy, setAddingCopy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.catalog.book(bookId);
      setBook(data);
      setNewCopy((c) => (c.zone ? c : { zone: data.copies[0]?.zone ?? data.category, shelf: data.copies[0]?.shelf ?? '' }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  const borrow = (copy: Copy) =>
    requireAuth('Inicia sesión para pedir este libro a tu nombre.', async () => {
      setBorrowing(copy.id);
      try {
        const loan = await api.loans.checkout(copy.code);
        Alert.alert('Es tuyo hasta el ' + formatDate(loan.dueDate), `Recoge el ejemplar ${copy.code} en ${where(copy)}. Lo verás en Préstamos.`);
        await load();
      } catch (err) {
        Alert.alert('No se pudo registrar el préstamo', errorMessage(err));
      } finally {
        setBorrowing(null);
      }
    });

  const generateSummary = () =>
    requireAuth('Inicia sesión para pedirle a Biblio un resumen de este libro.', async () => {
      setSummaryLoading(true);
      setSummary(null);
      try {
        setSummary((await api.ai.summary(bookId, level)).summary);
      } catch (err) {
        setSummary(`No se pudo generar el resumen: ${errorMessage(err)}`);
      } finally {
        setSummaryLoading(false);
      }
    });

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    const history = [...qa];
    setQa([...history, { role: 'user', content: q }]);
    setAsking(true);
    try {
      const res = await api.ai.ask(bookId, q, history);
      setQa((prev) => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (err) {
      setQa((prev) => [...prev, { role: 'assistant', content: `No pude responder: ${errorMessage(err)}` }]);
    } finally {
      setAsking(false);
    }
  };

  const addCopy = async () => {
    setAddingCopy(true);
    try {
      const copy = await api.catalog.addCopy(bookId, newCopy);
      Alert.alert('Ejemplar agregado', `Código ${copy.code}. Imprime su etiqueta QR y asígnale una etiqueta RFID desde Circulación.`);
      await load();
    } catch (err) {
      Alert.alert('No se pudo agregar', errorMessage(err));
    } finally {
      setAddingCopy(false);
    }
  };

  if (!book) {
    return error ? (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: spacing.lg, paddingTop: 100 }}>
        <ErrorBanner message={error} onRetry={load} />
      </View>
    ) : (
      <Loading label="Buscando el libro…" />
    );
  }

  const available = book.copies.filter((c) => c.status === 'AVAILABLE');
  const firstAvailable = available[0];
  const cloth = clothFor(book.category);
  const facts: Array<[string, string]> = [
    ['Autor', book.authors.join(', ')],
    ['Editorial', book.publisher ?? '—'],
    ['Año', book.year ? String(book.year) : '—'],
    ['Páginas', book.pages ? String(book.pages) : '—'],
    ['Idioma', book.language],
    ['Tema', book.category],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: !user && available.length > 0 ? 110 : spacing.xxl }}>
        {/* ------------------------------ Portada ------------------------------ */}
        <View style={[styles.hero, { backgroundColor: colors.inkDeep }]}>
          <SafeAreaView edges={['top']} style={{ alignItems: 'center', paddingTop: 44 }}>
            <View style={[styles.halo, { backgroundColor: cloth }]} />
            <BookCover title={book.title} category={book.category} author={book.authors[0]} size={136} />
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>{book.authors.join(', ')}</Text>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {/* --------------------------- Disponibilidad --------------------------- */}
          <View style={styles.availability}>
            <View style={[styles.stamp, { borderColor: available.length ? colors.success : colors.danger }]}>
              <Text style={[styles.stampText, { color: available.length ? colors.success : colors.danger }]}>
                {available.length ? 'En estante' : 'Prestado'}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[font.subtitle, { fontSize: 16 }]}>
                {available.length
                  ? `${available.length} de ${book.availability.total} ejemplares libres`
                  : `Los ${book.availability.total} ejemplares están prestados`}
              </Text>
              <Text style={font.small}>
                {firstAvailable ? `Lo encuentras en ${where(firstAvailable)}` : 'Vuelve pronto: se libera en cuanto alguien lo devuelva.'}
              </Text>
            </View>
          </View>

          <Text style={[font.reading, { marginTop: spacing.lg }]}>{book.synopsis}</Text>
          {book.tags.length > 0 && <Text style={styles.tags}>{book.tags.map((t) => `#${t}`).join('  ')}</Text>}

          {/* ----------------------- Ficha de catálogo ----------------------- */}
          <View style={styles.indexCard}>
            <View style={styles.indexHole} />
            <Text style={styles.indexHeading}>Ficha catalográfica</Text>
            {facts.map(([label, value]) => (
              <View key={label} style={styles.indexRow}>
                <Text style={styles.indexLabel}>{label}</Text>
                <Text style={styles.indexValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* ---------------------------- Ejemplares ---------------------------- */}
          <SectionTitle>Ejemplares</SectionTitle>
          {book.copies.length === 0 && <Text style={font.small}>Aún no hay ejemplares registrados.</Text>}
          {book.copies.map((copy) => {
            const status = COPY_STATUS[copy.status];
            const canBorrow = copy.status === 'AVAILABLE' && !isStaff;
            return (
              <View key={copy.id} style={styles.copyRow}>
                <View style={[styles.copyMark, { backgroundColor: copy.status === 'AVAILABLE' ? colors.success : colors.border }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.copyCode}>{copy.code}</Text>
                  <Text style={font.small}>{where(copy)}</Text>
                  {copy.misplaced && (
                    <View style={{ marginTop: 4 }}>
                      <Badge label={`Visto en ${copy.lastSeenZone}`} tone="warning" icon="warning" />
                    </View>
                  )}
                  {isStaff && (
                    <Text style={[font.small, { fontSize: 12, marginTop: 2 }]}>
                      RFID {copy.rfidEpc ?? 'sin etiqueta'}, leído {timeAgo(copy.lastSeenAt)}
                      {copy.lastSeenReaderId ? ` en ${copy.lastSeenReaderId}` : ''}
                    </Text>
                  )}
                </View>
                {canBorrow && user ? (
                  <Button title="Pedir" small onPress={() => borrow(copy)} loading={borrowing === copy.id} />
                ) : (
                  <Badge label={status.label} tone={status.tone} />
                )}
              </View>
            );
          })}

          {/* ------------------------- Biblio: resumen ------------------------- */}
          <Card style={styles.biblio}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Ionicons name="sparkles" size={18} color={colors.gold} />
              <Text style={[font.subtitle, { marginLeft: 8, color: colors.white }]}>Resumen con Biblio</Text>
            </View>
            <Text style={[font.small, { color: '#C9D1E3', marginBottom: spacing.md }]}>
              Elige qué tan profundo lo quieres y luego hazle preguntas sobre el libro.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {LEVELS.map((l) => (
                <Chip key={l.key} label={l.label} selected={level === l.key} accent={colors.gold} onPress={() => setLevel(l.key)} />
              ))}
            </View>
            <Button title={summary ? 'Generar otro resumen' : 'Generar resumen'} variant="gold" onPress={generateSummary} loading={summaryLoading} />
            {summaryLoading && <Text style={[font.small, { marginTop: spacing.sm, color: '#C9D1E3' }]}>Biblio está leyendo la ficha…</Text>}
            {summary && (
              <View style={styles.summary}>
                <MarkdownText text={summary} />
              </View>
            )}
            {summary && user && (
              <View style={{ marginTop: spacing.md }}>
                {qa.map((turn, i) => (
                  <View key={i} style={[styles.bubble, turn.role === 'user' ? styles.userBubble : styles.botBubble]}>
                    {turn.role === 'user' ? <Text style={{ color: colors.inkDeep }}>{turn.content}</Text> : <MarkdownText text={turn.content} />}
                  </View>
                ))}
                {asking && <Text style={[font.small, { marginVertical: spacing.sm, color: '#C9D1E3' }]}>Pensando…</Text>}
                <Input value={question} onChangeText={setQuestion} placeholder="¿Necesito saber matemáticas para leerlo?" onSubmitEditing={ask} style={{ marginTop: spacing.sm }} />
                <Button title="Preguntar" small variant="secondary" onPress={ask} disabled={!question.trim() || asking} />
              </View>
            )}
          </Card>

          {isStaff && (
            <Card>
              <Text style={font.subtitle}>Agregar ejemplar</Text>
              <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
                <View style={{ flex: 2, marginRight: spacing.sm }}>
                  <Input label="Zona" value={newCopy.zone} onChangeText={(zone) => setNewCopy((c) => ({ ...c, zone }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Estante" value={newCopy.shelf} onChangeText={(shelf) => setNewCopy((c) => ({ ...c, shelf }))} autoCapitalize="characters" />
                </View>
              </View>
              <Button title="Agregar" icon="add" variant="secondary" onPress={addCopy} loading={addingCopy} disabled={!newCopy.zone || !newCopy.shelf} />
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Invitado: la acción principal le pide iniciar sesión. */}
      {!user && available.length > 0 && (
        <View style={styles.footer}>
          <Button title="Pedir este libro" icon="bookmark-outline" onPress={() => borrow(available[0])} style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: spacing.xl, overflow: 'hidden' },
  halo: { position: 'absolute', top: 70, width: 260, height: 260, borderRadius: 130, opacity: 0.35 },
  title: { fontFamily: serif, fontSize: 26, lineHeight: 32, color: colors.white, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.xl },
  author: { color: colors.goldLight, fontSize: 15, marginTop: 4, textAlign: 'center' },
  body: { padding: spacing.lg },
  availability: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  stamp: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  stampText: { fontFamily: serif, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  tags: { color: colors.muted, fontSize: 13, marginTop: spacing.md, lineHeight: 20 },
  indexCard: {
    backgroundColor: '#FFFEFA',
    borderRadius: 4,
    marginTop: spacing.xl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderTopWidth: 3,
    borderTopColor: '#B5483F',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  indexHole: { position: 'absolute', top: 10, alignSelf: 'center', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  indexHeading: { fontFamily: serif, fontStyle: 'italic', color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
  indexRow: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#DCE6F0' },
  indexLabel: { width: 90, color: colors.muted, fontSize: 13 },
  indexValue: { flex: 1, fontFamily: serif, color: colors.text, fontSize: 15 },
  copyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  copyMark: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: spacing.md },
  copyCode: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  biblio: { backgroundColor: colors.ink, borderColor: colors.ink, marginTop: spacing.xl },
  summary: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  bubble: { padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm, maxWidth: '92%' },
  userBubble: { backgroundColor: colors.goldLight, alignSelf: 'flex-end' },
  botBubble: { backgroundColor: colors.card, alignSelf: 'flex-start' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
