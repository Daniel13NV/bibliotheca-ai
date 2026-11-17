import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/client';
import { Button, ErrorBanner, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type { RootScreenProps } from '../../navigation/types';
import { colors, font, serif, spacing } from '../../theme';

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', studentId: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Con la cuenta creada se cierra el formulario (y el inicio de sesión, si venía de ahí).
  useEffect(() => {
    if (user && navigation.canGoBack()) navigation.goBack();
  }, [user, navigation]);

  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;
  const shortPassword = form.password.length > 0 && form.password.length < 8;
  const valid = form.name.trim().length >= 3 && form.email.includes('@') && form.password.length >= 8 && !mismatch;

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        studentId: form.studentId.trim() || undefined,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.inkDeep }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ padding: 4, alignSelf: 'flex-start' }} accessibilityLabel="Regresar">
              <Ionicons name="arrow-back" size={24} color={colors.goldLight} />
            </Pressable>
            <Text style={styles.heading}>Tu credencial de lector</Text>
            <Text style={styles.sub}>Con ella pides libros desde el estante, renuevas en un toque y recibes avisos antes de la fecha límite.</Text>
          </View>
          <View style={styles.sheet}>
            <ErrorBanner message={error} />
            <Input label="Nombre completo" value={form.name} onChangeText={set('name')} autoComplete="name" />
            <Input
              label="Correo institucional"
              value={form.email}
              onChangeText={set('email')}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input label="Matrícula" value={form.studentId} onChangeText={set('studentId')} autoCapitalize="characters" placeholder="A00012345" />
            <Input
              label="Contraseña"
              value={form.password}
              onChangeText={set('password')}
              secureTextEntry
              error={shortPassword ? 'Usa al menos 8 caracteres' : null}
            />
            <Input
              label="Repite la contraseña"
              value={form.confirm}
              onChangeText={set('confirm')}
              secureTextEntry
              error={mismatch ? 'Las contraseñas no coinciden' : null}
            />
            <Button title="Crear cuenta" onPress={submit} loading={loading} disabled={!valid} style={{ marginTop: spacing.sm }} />
            <Text style={[font.small, { textAlign: 'center', marginTop: spacing.lg }]}>
              Tus datos solo se usan para los préstamos de la biblioteca.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl },
  heading: { fontFamily: serif, fontSize: 30, lineHeight: 36, color: colors.goldLight, marginTop: spacing.lg },
  sub: { color: '#C9D1E3', fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  sheet: { flex: 1, backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl },
});
