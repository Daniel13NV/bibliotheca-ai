import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainError } from '../../shared/domain-error';
import { Notification } from '../domain/notification';
import {
  CONTACT_DIRECTORY,
  ContactDirectory,
  NOTIFICATION_REPOSITORY,
  NOTIFICATION_SENDER,
  NotificationRepository,
  NotificationSender,
  Recipient,
  RECIPIENT_REPOSITORY,
  RecipientRepository,
} from '../domain/ports';
import { renderTemplate } from '../domain/templates';

const CONTACT_REFRESH_MS = 5 * 60_000;

@Injectable()
export class RecipientResolver {
  private readonly logger = new Logger(RecipientResolver.name);

  constructor(
    @Inject(RECIPIENT_REPOSITORY) private readonly recipients: RecipientRepository,
    @Inject(CONTACT_DIRECTORY) private readonly directory: ContactDirectory,
  ) {}

  /** Copia local (state transfer por eventos) con respaldo en users-service si falta o está desactualizada. */
  async resolve(userId: string): Promise<Recipient | null> {
    const local = await this.recipients.findById(userId);
    const stale = !local || (!local.telegramChatId && Date.now() - local.updatedAt.getTime() > CONTACT_REFRESH_MS);
    if (!stale) return local;
    try {
      const remote = await this.directory.find(userId);
      if (!remote) return local;
      const recipient = { ...remote, updatedAt: new Date() };
      await this.recipients.save(recipient);
      return recipient;
    } catch (err) {
      this.logger.warn(`No se pudo consultar users-service: ${(err as Error).message}`);
      return local;
    }
  }

  async upsert(data: { userId: string; name?: string; email?: string; chatId?: string | null }) {
    const current = await this.recipients.findById(data.userId);
    await this.recipients.save({
      userId: data.userId,
      name: data.name ?? current?.name ?? '',
      email: data.email ?? current?.email ?? '',
      telegramChatId: data.chatId !== undefined ? data.chatId : current?.telegramChatId ?? null,
      updatedAt: new Date(),
    });
  }
}

/** Convierte un evento de dominio en notificación y la entrega por Telegram (vía n8n). */
@Injectable()
export class NotifyUseCase {
  private readonly logger = new Logger(NotifyUseCase.name);

  constructor(
    private readonly resolver: RecipientResolver,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSender,
  ) {}

  async toUser(type: string, userId: string, data: Record<string, unknown>) {
    const message = renderTemplate(type, data);
    if (!message) return null;
    const recipient = await this.resolver.resolve(userId);
    const notification = Notification.create(
      { id: randomUUID(), userId, chatId: recipient?.telegramChatId ?? null, type, ...message },
      new Date(),
    );
    return this.deliver(notification);
  }

  /** Avisos para el personal: se envían al chat/grupo configurado en LIBRARY_ALERTS_CHAT_ID. */
  async toStaff(type: string, data: Record<string, unknown>) {
    const message = renderTemplate(type, data);
    if (!message) return null;
    const chatId = process.env.LIBRARY_ALERTS_CHAT_ID?.trim() || null;
    const notification = Notification.create({ id: randomUUID(), userId: null, chatId, type, ...message }, new Date());
    return this.deliver(notification);
  }

  async test(userId: string, name: string) {
    const result = await this.toUser('test', userId, { name });
    if (!result) throw DomainError.unavailable('No se pudo crear la notificación');
    return result;
  }

  private async deliver(notification: Notification) {
    if (notification.shouldDeliver) {
      try {
        await this.sender.send({
          chatId: notification.chatId!,
          text: notification.telegramText(),
          buttons: notification.snapshot().buttons,
          type: notification.snapshot().type,
          notificationId: notification.id,
        });
        notification.markSent(new Date());
      } catch (err) {
        notification.markFailed((err as Error).message);
        this.logger.warn(`Entrega fallida (${notification.snapshot().type}): ${(err as Error).message}`);
      }
    }
    await this.notifications.save(notification);
    return notification.view();
  }
}

@Injectable()
export class InboxQueries {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository) {}

  async inbox(userId: string) {
    const [items, unread] = await Promise.all([
      this.notifications.findByUser(userId, 100),
      this.notifications.countUnread(userId),
    ]);
    return { unread, items: items.map((n) => n.view()) };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.notifications.findById(id);
    if (!notification || notification.userId !== userId) throw DomainError.notFound('Notificación');
    notification.markRead();
    await this.notifications.save(notification);
    return notification.view();
  }

  async markAllRead(userId: string) {
    await this.notifications.markAllRead(userId);
    return { ok: true };
  }
}
