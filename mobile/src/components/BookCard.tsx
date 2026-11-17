import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Availability } from '../api/types';
import { clothFor, colors, font, radius, serif, spacing } from '../theme';
import { Badge } from './ui';

export const coverColor = clothFor;

/**
 * Portada de libro encuadernado en tela: color según el tema, doble filete dorado
 * arriba y abajo, título en serif y autor al pie. No usa imágenes externas.
 */
export function BookCover({
  title,
  category,
  author,
  size = 64,
}: {
  title: string;
  category: string;
  author?: string;
  size?: number;
}) {
  const height = Math.round(size * 1.45);
  const compact = size < 80;
  const titleSize = compact ? Math.max(8, size * 0.15) : Math.min(17, size * 0.13);
  return (
    <View style={[styles.cover, { width: size, height, backgroundColor: clothFor(category) }]}>
      <View style={styles.coverHinge} />
      <View style={[styles.rule, { top: height * 0.08 }]} />
      <View style={[styles.rule, { top: height * 0.08 + 3, opacity: 0.5 }]} />
      <View style={styles.coverBody}>
        <Text
          numberOfLines={compact ? 4 : 5}
          style={[styles.coverTitle, { fontSize: titleSize, lineHeight: titleSize * 1.2 }]}
        >
          {title}
        </Text>
        {!compact && author ? (
          <Text numberOfLines={1} style={styles.coverAuthor}>
            {author}
          </Text>
        ) : null}
      </View>
      <View style={[styles.rule, { bottom: height * 0.08 + 3, opacity: 0.5 }]} />
      <View style={[styles.rule, { bottom: height * 0.08 }]} />
    </View>
  );
}

/** Lomo de un libro de pie en el estante. Alto y grosor salen de las páginas del libro. */
export function BookSpine({
  title,
  category,
  pages,
  onPress,
}: {
  title: string;
  category: string;
  pages?: number | null;
  onPress?: () => void;
}) {
  const p = pages ?? 300;
  const height = 104 + Math.min(44, Math.round(p / 25));
  const width = 26 + Math.min(16, Math.round(p / 80));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.spine,
        { width, height, backgroundColor: clothFor(category), transform: [{ translateY: pressed ? -8 : 0 }] },
      ]}
    >
      <View style={styles.spineBand} />
      <View style={styles.spineTitleBox}>
        <Text
          numberOfLines={1}
          style={[
            styles.spineTitle,
            { width: height - 34, left: (width - (height - 34)) / 2, top: (height - 34) / 2 - 8 },
          ]}
        >
          {title}
        </Text>
      </View>
      <View style={[styles.spineBand, { top: undefined, bottom: 8 }]} />
    </Pressable>
  );
}

/** Estante de madera con lomos; se desliza horizontalmente. */
export function Shelf({
  books,
  onOpen,
}: {
  books: Array<{ id: string; title: string; category: string; pages?: number | null }>;
  onOpen: (id: string, title: string) => void;
}) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfRow}
      >
        {books.map((b) => (
          <BookSpine key={b.id} title={b.title} category={b.category} pages={b.pages} onPress={() => onOpen(b.id, b.title)} />
        ))}
      </ScrollView>
      <View style={styles.plank} />
      <View style={styles.plankEdge} />
    </View>
  );
}

export function AvailabilityBadge({ availability }: { availability: Availability | null | undefined }) {
  if (!availability) return <Badge label="Sin datos" />;
  if (availability.total === 0) return <Badge label="Sin ejemplares" tone="neutral" />;
  return availability.available > 0 ? (
    <Badge label={`${availability.available} de ${availability.total} en estante`} tone="success" icon="checkmark-circle" />
  ) : (
    <Badge label="Todos prestados" tone="danger" icon="time" />
  );
}

/** Fila de libro para listas y resultados de búsqueda. */
export function BookCard({
  title,
  authors,
  category,
  year,
  availability,
  extra,
  onPress,
}: {
  title: string;
  authors: string[];
  category: string;
  year?: number | null;
  availability?: Availability | null;
  extra?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.goldSoft }]}>
      <BookCover title={title} category={category} size={56} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={[font.subtitle, { fontSize: 16, lineHeight: 21 }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[font.small, { marginTop: 2 }]} numberOfLines={1}>
          {authors.join(', ')}
          {year ? `, ${year}` : ''}
        </Text>
        <Text style={[styles.category, { color: clothFor(category) }]}>{category}</Text>
        <AvailabilityBadge availability={availability} />
        {extra}
      </View>
    </Pressable>
  );
}

/** Portada con título y disponibilidad debajo, para carruseles. */
export function BookTile({
  title,
  authors,
  category,
  availability,
  onPress,
  width = 112,
}: {
  title: string;
  authors: string[];
  category: string;
  availability?: Availability | null;
  onPress?: () => void;
  width?: number;
}) {
  const free = availability ? availability.available : 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width, marginRight: spacing.lg, opacity: pressed ? 0.8 : 1 }]}>
      <BookCover title={title} category={category} author={authors[0]} size={width} />
      <Text numberOfLines={2} style={[font.subtitle, { fontSize: 14, lineHeight: 18, marginTop: spacing.sm }]}>
        {title}
      </Text>
      <Text numberOfLines={1} style={[font.small, { fontSize: 12 }]}>
        {authors[0]}
      </Text>
      {availability && (
        <Text style={[styles.tileStock, { color: free > 0 ? colors.success : colors.danger }]}>
          {free > 0 ? `${free} disponible${free > 1 ? 's' : ''}` : 'Prestado'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 2, height: 3 },
    elevation: 3,
  },
  coverHinge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '9%',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  rule: { position: 'absolute', left: '16%', right: '7%', height: 1, backgroundColor: colors.goldLight },
  coverBody: { flex: 1, justifyContent: 'space-between', paddingLeft: '18%', paddingRight: '9%', paddingVertical: '24%' },
  coverTitle: { fontFamily: serif, color: '#F6EBD3', fontWeight: '600' },
  coverAuthor: { fontFamily: serif, fontStyle: 'italic', fontSize: 10, color: colors.goldLight },
  spine: {
    marginRight: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.15)',
    borderRightWidth: 2,
    borderRightColor: 'rgba(0,0,0,0.25)',
  },
  spineBand: { position: 'absolute', top: 8, left: 3, right: 3, height: 3, backgroundColor: colors.gold, opacity: 0.85 },
  spineTitleBox: { position: 'absolute', top: 17, bottom: 17, left: 0, right: 0 },
  spineTitle: {
    position: 'absolute',
    height: 16,
    fontFamily: serif,
    fontSize: 11,
    lineHeight: 16,
    color: '#F6EBD3',
    textAlign: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  shelfRow: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  plank: {
    height: 12,
    backgroundColor: colors.wood,
    marginHorizontal: spacing.sm,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  plankEdge: { height: 5, backgroundColor: colors.woodDark, marginHorizontal: spacing.sm, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderRadius: radius.sm,
  },
  category: { fontSize: 12, fontWeight: '700', marginTop: 4, marginBottom: 6 },
  tileStock: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
