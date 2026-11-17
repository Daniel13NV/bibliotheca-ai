import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, font, radius, spacing, Tone, toneColors } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}) {
  if (!scroll) return <View style={[styles.screen, padded && styles.padded]}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[padded && styles.padded, { paddingBottom: spacing.xxl }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.ink} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.ink, fg: colors.white, border: colors.ink },
    secondary: { bg: colors.card, fg: colors.ink, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
    gold: { bg: colors.gold, fg: colors.white, border: colors.gold },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 15 : 18} color={palette.fg} style={{ marginRight: 6 }} />}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string | null }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={c.fg} style={{ marginRight: 4 }} />}
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  accent,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Color del chip seleccionado (por ejemplo dorado sobre fondos oscuros). */
  accent?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected, selected && accent ? { backgroundColor: accent, borderColor: accent } : null]}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? colors.white : colors.ink} style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={[font.subtitle, { fontSize: 20, lineHeight: 26 }]}>{children}</Text>
      {action}
    </View>
  );
}

export function EmptyState({ icon = 'book-outline', title, message }: { icon?: IconName; title: string; message?: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={42} color={colors.gold} />
      <Text style={[font.subtitle, { marginTop: spacing.sm, textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[font.small, { textAlign: 'center', marginTop: 4 }]}>{message}</Text> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.ink} />
      {label ? <Text style={[font.small, { marginTop: spacing.sm }]}>{label}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={[font.small, { color: colors.danger, flex: 1, marginLeft: 6 }]}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Stat({ label, value, tone = 'neutral', icon }: { label: string; value: string | number; tone?: Tone; icon?: IconName }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.stat, { backgroundColor: c.bg }]}>
      {icon && <Ionicons name={icon} size={18} color={c.fg} />}
      <Text style={[styles.statValue, { color: c.fg }]}>{value}</Text>
      <Text style={[font.small, { color: c.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Renderizador mínimo de Markdown (negritas, títulos y viñetas) para respuestas del LLM. */
export function MarkdownText({ text, color = colors.text }: { text: string; color?: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 6 }} />;
        const heading = line.match(/^#{1,4}\s+(.*)$/);
        const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
        const content = heading ? heading[1] : bullet ? bullet[1] : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        const inline = parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**') ? (
            <Text key={j} style={{ fontWeight: '700' }}>
              {p.slice(2, -2)}
            </Text>
          ) : (
            <Text key={j}>{p}</Text>
          ),
        );
        if (heading) {
          return (
            <Text key={i} style={[font.subtitle, { color, marginTop: 6, marginBottom: 2 }]}>
              {inline}
            </Text>
          );
        }
        if (bullet) {
          const marker = line.trim().match(/^\d+[.)]/)?.[0] ?? '•';
          return (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
              <Text style={[font.body, { color, width: 22 }]}>{marker}</Text>
              <Text style={[font.body, { color, flex: 1 }]}>{inline}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={[font.body, { color, marginBottom: 2 }]}>
            {inline}
          </Text>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  padded: { padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  buttonText: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, marginBottom: 6, fontWeight: '600', color: colors.inkSoft },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, color: colors.ink, fontWeight: '500' },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  stat: { flex: 1, borderRadius: radius.md, padding: spacing.md, marginHorizontal: 4, alignItems: 'flex-start' },
  statValue: { fontSize: 22, fontWeight: '800', marginVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
