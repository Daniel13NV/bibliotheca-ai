import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

/** Navegación hacia las pantallas del stack raíz desde cualquier pestaña. */
export const useRootNavigation = () => useNavigation<NativeStackNavigationProp<RootStackParamList>>();
