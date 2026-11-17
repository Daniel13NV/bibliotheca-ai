import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import type { ChatTurn, RecommendedBook } from '../api/types';
import { AvailabilityBadge } from '../components/BookCard';
import { Chip, MarkdownText } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRootNavigation } from '../navigation/hooks';
import { colors, font, radius, spacing } from '../theme';

interface Message extends ChatTurn {
  id: string;
  books?: RecommendedBook[];
  degraded?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  'Busco un libro que hable sobre física cuántica para principiantes',
  '¿Qué me recomiendas para aprender arquitectura de software?',
  'Quiero una novela latinoamericana clásica',
  'Algo para entender cómo tomamos decisiones',
];

export default function AssistantScreen() {
  const nav = useRootNavigation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `¡Hola, ${user?.name.split(' ')[0] ?? 'lector'}! Soy **Biblio**, el asistente de la biblioteca. Cuéntame qué tema te interesa y te recomiendo libros reales del catálogo, con su disponibilidad y ubicación.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const list = useRef<FlatList<Message>>(null);

  const send = async (text = input) => {
    const question = text.trim();
    if (!question || thinking) return;
    setInput('');
    const history: ChatTurn[] = messages
      .filter((m) => m.id !== 'welcome' && !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { id: `u${Date.now()}`, role: 'user', content: question }]);
    setThinking(true);
    try {
      const res = await api.ai.chat(question, history);
      setMessages((prev) => [
        ...prev,
        { id: `a${Date.now()}`, role: 'assistant', content: res.answer, books: res.books, degraded: !res.llmAvailable },
      ]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: `e${Date.now()}`, role: 'assistant', content: `⚠️ ${errorMessage(err)}`, error: true }]);
    } finally {
      setThinking(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          <>
            {thinking && (
              <View style={[styles.bubble, styles.bot, { flexDirection: 'row', alignItems: 'center' }]}>
                <Ionicons name="sparkles" size={16} color={colors.gold} />
                <Text style={[font.small, { marginLeft: 6 }]}>Biblio está buscando en el catálogo…</Text>
              </View>
            )}
            {messages.length === 1 && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={[font.caption, { marginBottom: spacing.sm }]}>Prueba con</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {SUGGESTIONS.map((s) => (
                    <Chip key={s} label={s} onPress={() => send(s)} />
                  ))}
                </View>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
            {item.role === 'user' ? (
              <Text style={{ color: colors.white, fontSize: 15 }}>{item.content}</Text>
            ) : (
              <>
                <MarkdownText text={item.content} />
                {item.degraded && <Text style={[font.small, { marginTop: 6, color: colors.warning }]}>Modo sin LLM: resultados directos de la búsqueda semántica.</Text>}
                {item.books && item.books.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
                    {item.books.map((b) => (
                      <Pressable key={b.bookId} style={styles.bookChip} onPress={() => nav.navigate('BookDetail', { bookId: b.bookId, title: b.title })}>
                        <Text style={[font.subtitle, { fontSize: 14 }]} numberOfLines={2}>
                          {b.title}
                        </Text>
                        <Text style={[font.small, { marginVertical: 4 }]} numberOfLines={1}>
                          {b.authors.join(', ')}
                        </Text>
                        <AvailabilityBadge availability={b.availability} />
                        {b.availability?.locations?.[0] && (
                          <Text style={[font.small, { marginTop: 4 }]} numberOfLines={1}>
                            📍 {b.availability.locations[0]}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escribe qué te gustaría leer…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Pressable onPress={() => send()} disabled={!input.trim() || thinking} style={[styles.send, (!input.trim() || thinking) && { opacity: 0.4 }]}>
          <Ionicons name="send" size={18} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, maxWidth: '92%' },
  user: { backgroundColor: colors.ink, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bot: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bookChip: {
    width: 180,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
});
