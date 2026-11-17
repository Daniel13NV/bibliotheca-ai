import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiConfig, errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button, ErrorBanner, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type { RootScreenProps } from '../../navigation/types';
import { colors, font, serif, spacing } from '../../theme';

/** Lomos decorativos sobre la repisa del encabezado. */
const DECOR = [
  { h: 74, w: 18, c: '#7A3B3B' },
  { h: 90, w: 24, c: '#24476B' },
  { h: 66, w: 16, c: '#2F5D50' },
  { h: 96, w: 22, c: '#54457A' },
  { h: 80, w: 20, c: '#8A5A3B' },
  { h: 70, w: 26, c: '#3F5E7A' },
  { h: 88, w: 18, c: '#6B4E3D' },
];

export function ShelfOrnament() {
  return (
    <View style={styles.ornament}>
      <View style={styles.ornamentRow}>
        {DECOR.map((b, i) => (
          <View
            key={i}
            style={[
              styles.ornamentSpine,
              { height: b.h, width: b.w, backgroundColor: b.c },
              i === 4 && { transform: [{ rotate: '8deg' }], marginLeft: 6 },
            ]}
          >
            <View style={styles.ornamentBand} />
          </View>
        ))}
      </View>
      <View style={styles.ornamentPlank} />
    </View>
  );
}

export default function LoginScreen({ navigation, route }: RootScreenProps<'Login'>) {
  const { user, login, serverUrl, setServerUrl } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showServer, setShowServer] = useState(false);
  const [server, setServer] = useState(serverUrl);
  const [serverStatus, setServerStatus] = useState<string | null>(null);

  // Al iniciar sesión (aquí o desde Registro) se regresa a donde estaba la persona.
  useEffect(() => {
    if (user && navigation.canGoBack()) navigation.goBack();
  }, [user, navigation]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const testServer = async () => {
    await setServerUrl(server);
    setServerStatus('Probando…');
    try {
      const health = await api.health();
      const up = health.services.filter((s) => s.status === 'up').length;
      setServerStatus(`Conectado a ${apiConfig.getBaseUrl()}: ${up} de ${health.services.length} servicios activos`);
    } catch (err) {
      setServerStatus(errorMessage(err));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.inkDeep }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.close} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={colors.goldLight} />
            </Pressable>
            <ShelfOrnament />
            <Text style={styles.brand}>Bibliotheca</Text>
            <Text style={styles.tagline}>
              {route.params?.reason ?? 'Entra con tu correo institucional para pedir libros y seguir tus préstamos.'}
            </Text>
          </View>

          <View style={styles.sheet}>
            <Text style={[font.title, { marginBottom: spacing.lg }]}>Iniciar sesión</Text>
            <ErrorBanner message={error} />
            <Input
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="nombre@bibliotheca.edu.mx"
            />
            <View>
              <Input
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                onSubmitEditing={submit}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eye} hitSlop={10}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Button title="Entrar" onPress={submit} loading={loading} disabled={!email || !password} />

            <View style={styles.registerRow}>
              <Text style={font.small}>¿Primera vez en la biblioteca?</Text>
              <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8}>
                <Text style={styles.link}>Crear cuenta</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => setShowServer((v) => !v)} style={styles.serverToggle}>
              <Ionicons name="settings-outline" size={13} color={colors.muted} />
              <Text style={[font.small, { marginLeft: 6, fontSize: 12 }]}>Servidor: {serverUrl}</Text>
            </Pressable>
            {showServer && (
              <View style={{ marginTop: spacing.sm }}>
                <Input label="Dirección del servidor" value={server} onChangeText={setServer} autoCapitalize="none" placeholder="http://192.168.1.50:3000" />
                <Button title="Guardar y probar conexión" variant="secondary" small onPress={testServer} />
                {serverStatus && <Text style={[font.small, { marginTop: spacing.sm }]}>{serverStatus}</Text>}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.md },
  close: { alignSelf: 'flex-start', padding: 4, marginBottom: spacing.sm },
  brand: { fontFamily: serif, fontSize: 38, lineHeight: 44, color: colors.goldLight, marginTop: spacing.lg },
  tagline: { color: '#C9D1E3', fontSize: 15, lineHeight: 22, marginTop: spacing.sm, maxWidth: 340 },
  sheet: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  eye: { position: 'absolute', right: 14, top: 38 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, gap: 6 },
  link: { color: colors.ink, fontWeight: '700', textDecorationLine: 'underline', fontSize: 14 },
  serverToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  ornament: { width: 220 },
  ornamentRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10 },
  ornamentSpine: { marginRight: 3, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  ornamentBand: { position: 'absolute', top: 7, left: 3, right: 3, height: 2, backgroundColor: colors.gold, opacity: 0.8 },
  ornamentPlank: { height: 8, backgroundColor: colors.wood, borderBottomWidth: 3, borderBottomColor: colors.woodDark, borderRadius: 2 },
});

