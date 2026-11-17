import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { Book, RecommendedBook } from '../api/types';
import { useRequireAuth } from '../components/AuthGate';
import { BookCard, BookTile, Shelf } from '../components/BookCard';
import { Chip, EmptyState, ErrorBanner, SectionTitle } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRootNavigation } from '../navigation/hooks';
import { CATEGORY_ICON, clothFor, colors, font, radius, serif, spacing } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Trae el acervo completo (32 títulos en los datos iniciales; pagina si crece). */
async function fetchAllBooks(): Promise<Book[]> {
  const first = await api.catalog.search({ page: 1, pageSize: 50 });
  const items = [...first.items];
  for (let page = 2; items.length < first.total && page <= 10; page++) {
    items.push(...(await api.catalog.search({ page, pageSize: 50 })).items);
  }
  return items;
}

export default function CatalogScreen() {
  const nav = useRootNavigation();
  const tabNav = useNavigation<any>();
  const requireAuth = useRequireAuth();
  const { user, isStaff } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [availableOnly, setAvailableOnly] = useState(false);
  const [results, setResults] = useState<Book[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [aiResults, setAiResults] = useState<RecommendedBook[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const browsing = query.trim().length > 0 || Boolean(category) || availableOnly;

  const load = useCallback(async () => {
    setError(null);
    try {
      setBooks(await fetchAllBooks());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // La disponibilidad cambia con préstamos y lecturas RFID: se refresca al volver a la pestaña.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    setAiResults(null);
    if (!browsing) {
      setResults(null);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.catalog.search({ search: query.trim() || undefined, category, availableOnly, pageSize: 50 });
        setResults(res.items);
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, category, availableOnly, browsing]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    books.forEach((b) => counts.set(b.category, (counts.get(b.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [books]);

  const onShelf = useMemo(() => books.filter((b) => b.availability.available > 0), [books]);
  const copiesOnShelf = useMemo(() => books.reduce((sum, b) => sum + b.availability.available, 0), [books]);
  // Para el estante del encabezado: se alternan temas para que se vea variado.
  const shelfBooks = useMemo(() => {
    const byCat = new Map<string, Book[]>();
    books.forEach((b) => byCat.set(b.category, [...(byCat.get(b.category) ?? []), b]));
    const mixed: Book[] = [];
    for (let i = 0; mixed.length < Math.min(16, books.length); i++) {
      for (const list of byCat.values()) if (list[i]) mixed.push(list[i]);
      if (i > 10) break;
    }
    return mixed.slice(0, 16);
  }, [books]);

  const open = (id: string, title: string) => nav.navigate('BookDetail', { bookId: id, title });

  const runAiSearch = () =>
    requireAuth('Inicia sesión para que Biblio busque libros por significado.', async () => {
      setAiLoading(true);
      try {
        setAiResults((await api.ai.search(query.trim())).results);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setAiLoading(false);
      }
    });

  const firstName = user?.name.split(' ')[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.goldLight}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {/* ------------------------------ Encabezado ------------------------------ */}
        <View style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.topRow}>
              <Text style={styles.brand}>Bibliotheca</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isStaff && (
                  <HeaderIcon icon="add-circle-outline" label="Registrar libro" onPress={() => nav.navigate('AddBook')} />
                )}
                {user ? (
                  <>
                    <HeaderIcon icon="notifications-outline" label="Avisos" onPress={() => nav.navigate('Notifications')} />
                    <Pressable onPress={() => tabNav.navigate('Profile')} style={styles.avatar} accessibilityLabel="Tu cuenta">
                      <Text style={styles.avatarText}>{initials(user.name)}</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable onPress={() => nav.navigate('Login', {})} style={styles.signIn}>
                    <Text style={styles.signInText}>Entrar</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <Text style={styles.hello}>{firstName ? `Hola, ${firstName}` : 'Bienvenido al acervo'}</Text>
            <Text style={styles.headline}>¿Qué vas a leer hoy?</Text>
            {books.length > 0 && (
              <Text style={styles.stats}>
                {books.length} títulos en {categories.length} temas, {copiesOnShelf} ejemplares esperando en estante.
              </Text>
            )}

            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Título, autor o tema"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          </SafeAreaView>
          {!browsing && shelfBooks.length > 0 && <Shelf books={shelfBooks} onOpen={open} />}
        </View>

        <View style={styles.body}>
          <ErrorBanner message={error} onRetry={load} />
          {loading && <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xl }} />}

          {/* --------------------------- Búsqueda / filtros --------------------------- */}
          {browsing ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
                {category && <Chip label={category} selected icon="close" onPress={() => setCategory(undefined)} />}
                <Chip
                  label="Solo en estante"
                  selected={availableOnly}
                  icon={availableOnly ? 'checkmark' : 'filter-outline'}
                  onPress={() => setAvailableOnly((v) => !v)}
                />
              </View>

              {!isStaff && query.trim().length >= 3 && (
                <Pressable onPress={runAiSearch} style={styles.aiStrip}>
                  <Ionicons name="sparkles" size={18} color={colors.gold} />
                  <Text style={styles.aiStripText}>
                    Buscar “{query.trim()}” por significado con Biblio
                  </Text>
                  {aiLoading ? <ActivityIndicator color={colors.goldLight} /> : <Ionicons name="chevron-forward" size={18} color={colors.goldLight} />}
                </Pressable>
              )}

              {aiResults && (
                <>
                  <SectionTitle>Biblio sugiere</SectionTitle>
                  {aiResults.length === 0 && <Text style={font.small}>No encontró libros cercanos a esa idea. Prueba describiéndola distinto.</Text>}
                  {aiResults.map((b) => (
                    <BookCard
                      key={`ai-${b.bookId}`}
                      title={b.title}
                      authors={b.authors}
                      category={b.category}
                      availability={b.availability}
                      onPress={() => open(b.bookId, b.title)}
                      extra={<Text style={[font.small, { marginTop: 6 }]}>Coincidencia del {Math.round(b.score * 100)} %</Text>}
                    />
                  ))}
                </>
              )}

              <SectionTitle action={searching ? <ActivityIndicator color={colors.ink} /> : undefined}>
                {results ? `${results.length} ${results.length === 1 ? 'libro' : 'libros'}` : 'Buscando…'}
              </SectionTitle>
              {results?.length === 0 && (
                <EmptyState icon="search-outline" title="Nada con ese nombre" message="Prueba con el apellido del autor o con un tema más general." />
              )}
              {results?.map((b) => (
                <BookCard
                  key={b.id}
                  title={b.title}
                  authors={b.authors}
                  category={b.category}
                  year={b.year}
                  availability={b.availability}
                  onPress={() => open(b.id, b.title)}
                />
              ))}
            </>
          ) : (
            !loading && (
              <>
                {/* -------------------------------- Temas -------------------------------- */}
                <SectionTitle>Temas</SectionTitle>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
                  {categories.map((c) => (
                    <Pressable
                      key={c.name}
                      onPress={() => setCategory(c.name)}
                      style={({ pressed }) => [styles.topic, { backgroundColor: clothFor(c.name), opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Ionicons name={(CATEGORY_ICON[c.name] ?? 'book-outline') as IconName} size={20} color={colors.goldLight} />
                      <Text style={styles.topicName} numberOfLines={2}>
                        {c.name}
                      </Text>
                      <Text style={styles.topicCount}>
                        {c.count} {c.count === 1 ? 'libro' : 'libros'}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* ------------------------------ En estante ------------------------------ */}
                <SectionTitle>En el estante ahora</SectionTitle>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
                  {onShelf.slice(0, 12).map((b) => (
                    <BookTile
                      key={b.id}
                      title={b.title}
                      authors={b.authors}
                      category={b.category}
                      availability={b.availability}
                      onPress={() => open(b.id, b.title)}
                    />
                  ))}
                </ScrollView>

                {/* ------------------------------ Biblio (IA) ------------------------------ */}
                {!isStaff && (
                  <Pressable
                    onPress={() => (user ? tabNav.navigate('Assistant') : nav.navigate('Login', { reason: 'Inicia sesión para conversar con Biblio, el asistente del acervo.' }))}
                    style={({ pressed }) => [styles.biblio, pressed && { opacity: 0.9 }]}
                  >
                    <View style={styles.biblioSeal}>
                      <Ionicons name="sparkles" size={22} color={colors.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.biblioTitle}>¿No sabes por dónde empezar?</Text>
                      <Text style={styles.biblioText}>
                        Cuéntale a Biblio qué quieres aprender y te sugiere libros del acervo con su estante.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.goldLight} />
                  </Pressable>
                )}

                {/* ------------------------- Un estante por tema ------------------------- */}
                {categories.slice(0, 4).map((c) => (
                  <View key={`row-${c.name}`}>
                    <SectionTitle
                      action={
                        <Pressable onPress={() => setCategory(c.name)} hitSlop={8}>
                          <Text style={styles.seeAll}>Ver los {c.count}</Text>
                        </Pressable>
                      }
                    >
                      {c.name}
                    </SectionTitle>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
                      {books
                        .filter((b) => b.category === c.name)
                        .map((b) => (
                          <BookTile
                            key={b.id}
                            width={96}
                            title={b.title}
                            authors={b.authors}
                            category={b.category}
                            availability={b.availability}
                            onPress={() => open(b.id, b.title)}
                          />
                        ))}
                    </ScrollView>
                  </View>
                ))}
              </>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderIcon({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel={label} style={{ marginRight: spacing.md }}>
      <Ionicons name={icon} size={23} color={colors.goldLight} />
    </Pressable>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.inkDeep, paddingBottom: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  brand: { fontFamily: serif, fontSize: 22, color: colors.goldLight, letterSpacing: 0.5 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.goldLight, fontWeight: '700', fontSize: 13 },
  signIn: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 6 },
  signInText: { color: colors.goldLight, fontWeight: '700' },
  hello: { color: colors.goldLight, fontSize: 15, paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  headline: { fontFamily: serif, fontSize: 31, lineHeight: 38, color: colors.white, paddingHorizontal: spacing.lg, marginTop: 2 },
  stats: { color: colors.inkMuted, fontSize: 13, lineHeight: 19, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: spacing.sm, fontSize: 15, color: colors.text },
  body: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  bleed: { marginHorizontal: -spacing.lg },
  topic: { width: 124, height: 96, borderRadius: radius.md, padding: spacing.md, marginRight: spacing.sm, justifyContent: 'space-between' },
  topicName: { fontFamily: serif, color: colors.white, fontSize: 15, lineHeight: 18 },
  topicCount: { color: colors.goldLight, fontSize: 12 },
  biblio: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  biblioSeal: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  biblioTitle: { fontFamily: serif, color: colors.white, fontSize: 17, lineHeight: 22 },
  biblioText: { color: '#C9D1E3', fontSize: 13, lineHeight: 19, marginTop: 2 },
  aiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  aiStripText: { flex: 1, color: colors.white, marginHorizontal: spacing.sm, fontSize: 14 },
  seeAll: { color: colors.ink, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' },
});
