import { Notification, NotificationButton } from './notification';

export interface Recipient {
  userId: string;
  name: string;
  email: string;
  telegramChatId: string | null;
  updatedAt: Date;
}

export const RECIPIENT_REPOSITORY = Symbol('RECIPIENT_REPOSITORY');
export interface RecipientRepository {
  findById(userId: string): Promise<Recipient | null>;
  save(recipient: Recipient): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByUser(userId: string, limit: number): Promise<Notification[]>;
  countUnread(userId: string): Promise<number>;
  markAllRead(userId: string): Promise<void>;
  save(notification: Notification): Promise<void>;
}

/** Puerto hacia users-service para conocer el chat de Telegram de un usuario. */
export const CONTACT_DIRECTORY = Symbol('CONTACT_DIRECTORY');
export interface ContactDirectory {
  find(userId: string): Promise<Omit<Recipient, 'updatedAt'> | null>;
}

/** Puerto de entrega: hoy n8n → Telegram; mañana podría ser correo o push. */
export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');
export interface OutgoingMessage {
  chatId: string;
  text: string;
  buttons: NotificationButton[];
  type: string;
  notificationId: string;
}
export interface NotificationSender {
  send(message: OutgoingMessage): Promise<void>;
}
