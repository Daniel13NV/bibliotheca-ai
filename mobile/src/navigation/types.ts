import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Tabs: undefined;
  Login: { reason?: string } | undefined;
  Register: undefined;
  BookDetail: { bookId: string; title?: string };
  Notifications: undefined;
  AddBook: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
