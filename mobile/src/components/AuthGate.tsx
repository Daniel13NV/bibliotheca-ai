import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRootNavigation } from '../navigation/hooks';
import { colors, font, spacing } from '../theme';
import { Button } from './ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Ejecuta una acción solo si hay sesión; si no, abre el inicio de sesión
 * explicando para qué se necesita.
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const nav = useRootNavigation();
  return useCallback(
    (reason: string, action?: () => void) => {
      if (user) {
        action?.();
        return true;
      }
      nav.navigate('Login', { reason });
      return false;
    },
    [user, nav],
  );
}

/** Ilustración: libro cerrado con listón y candado, hecha con vistas. */
function ClosedBook({ icon }: { icon: IconName }) {
  return (
    <View style={styles.book}>
      <View style={styles.bookHinge} />
      <View style={styles.bookRule} />
      <View style={styles.bookSeal}>
        <Ionicons name={icon} size={30} color={colors.gold} />
      </View>
      <View style={[styles.bookRule, { top: undefined, bottom: 18 }]} />
      <View style={styles.ribbon} />
    </View>
  );
}

/** Pantalla que reemplaza a una sección privada cuando se explora como invitado. */
export function SignInPrompt({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  const nav = useRootNavigation();
  return (
    <View style={styles.wrap}>
      <ClosedBook icon={icon} />
      <Text style={[font.title, { textAlign: 'center', marginTop: spacing.xl }]}>{title}</Text>
      <Text style={[font.body, styles.message]}>{message}</Text>
      <Button title="Iniciar sesión" icon="log-in-outline" onPress={() => nav.navigate('Login', {})} style={styles.cta} />
      <Button title="Crear cuenta" variant="ghost" onPress={() => nav.navigate('Register')} style={styles.cta} />
    </View>
  );
}

/** Envuelve una pantalla privada: muestra el contenido con sesión o la invitación sin ella. */
export function withAuth<P extends object>(
  Screen: React.ComponentType<P>,
  copy: { icon: IconName; title: string; message: string },
) {
  return function Protected(props: P) {
    const { user } = useAuth();
    return user ? <Screen {...props} /> : <SignInPrompt {...copy} />;
  };
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  message: { textAlign: 'center', color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.xl, maxWidth: 320 },
  cta: { alignSelf: 'stretch', marginBottom: spacing.sm, maxWidth: 360, width: '100%' },
  book: {
    width: 118,
    height: 160,
    backgroundColor: colors.ink,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 4, height: 8 },
    elevation: 6,
  },
  bookHinge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, backgroundColor: colors.inkDeep },
  bookRule: { position: 'absolute', top: 18, left: 22, right: 12, height: 1, backgroundColor: colors.goldLight },
  bookSeal: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  ribbon: { position: 'absolute', bottom: -18, right: 28, width: 10, height: 30, backgroundColor: '#9C2F2F' },
});

