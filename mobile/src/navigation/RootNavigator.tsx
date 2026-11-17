import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { withAuth } from '../components/AuthGate';
import { Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import AssistantScreen from '../screens/AssistantScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import CatalogScreen from '../screens/CatalogScreen';
import LoansScreen from '../screens/LoansScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ScanScreen from '../screens/ScanScreen';
import AddBookScreen from '../screens/staff/AddBookScreen';
import RfidMonitorScreen from '../screens/staff/RfidMonitorScreen';
import { colors, serif } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const headerStyle = {
  headerStyle: { backgroundColor: colors.inkDeep },
  headerTintColor: colors.goldLight,
  headerTitleStyle: { fontFamily: serif, fontSize: 19, color: colors.white },
  headerShadowVisible: false,
};

function tabIcon(name: IconName, active: IconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : name} color={color} size={size - 2} />
  );
}

// Secciones privadas: sin sesión muestran una invitación a entrar.
const Assistant = withAuth(AssistantScreen, {
  icon: 'sparkles',
  title: 'Pregúntale a Biblio',
  message: 'Con tu cuenta, el asistente te recomienda libros del acervo según lo que quieras aprender.',
});
const Scan = withAuth(ScanScreen, {
  icon: 'scan',
  title: 'Llévate un libro',
  message: 'Inicia sesión para escanear un ejemplar en el estante y registrarlo a tu nombre.',
});
const Loans = withAuth(LoansScreen, {
  icon: 'bookmarks',
  title: 'Tus préstamos',
  message: 'Aquí verás tus fechas de devolución, renovaciones y multas.',
});
const Profile = withAuth(ProfileScreen, {
  icon: 'person',
  title: 'Tu credencial',
  message: 'Entra o crea tu cuenta con tu correo institucional y tu matrícula.',
});

function MainTabs() {
  const { isStaff } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={{
        ...headerStyle,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.inkDeep, borderTopWidth: 0, height: 62, paddingTop: 6, paddingBottom: 8 },
      }}
    >
      <Tab.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{ title: 'Explorar', headerShown: false, tabBarIcon: tabIcon('library-outline', 'library') }}
      />
      {isStaff ? (
        <>
          <Tab.Screen name="Scan" component={Scan} options={{ title: 'Circulación', tabBarIcon: tabIcon('swap-horizontal-outline', 'swap-horizontal') }} />
          <Tab.Screen name="Rfid" component={RfidMonitorScreen} options={{ title: 'RFID', tabBarIcon: tabIcon('radio-outline', 'radio') }} />
        </>
      ) : (
        <>
          <Tab.Screen name="Assistant" component={Assistant} options={{ title: 'Biblio', tabBarIcon: tabIcon('sparkles-outline', 'sparkles') }} />
          <Tab.Screen name="Scan" component={Scan} options={{ title: 'Escanear', tabBarIcon: tabIcon('scan-outline', 'scan') }} />
        </>
      )}
      <Tab.Screen name="Loans" component={Loans} options={{ title: 'Préstamos', tabBarIcon: tabIcon('bookmarks-outline', 'bookmarks') }} />
      <Tab.Screen name="Profile" component={Profile} options={{ title: 'Cuenta', tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { ready } = useAuth();
  if (!ready) return <Loading label="Abriendo la biblioteca…" />;

  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Avisos' }} />
      <Stack.Screen name="AddBook" component={AddBookScreen} options={{ title: 'Registrar libro' }} />
      <Stack.Group screenOptions={{ presentation: 'modal', headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
