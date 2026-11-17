import { Injectable } from '@nestjs/common';
import { ContactDirectory, NotificationSender, OutgoingMessage } from '../../domain/ports';

/** Entrega por n8n: el flujo "Bibliotheca · Notificaciones" recibe el webhook y llama a Telegram. */
@Injectable()
export class N8nWebhookSender implements NotificationSender {
  private readonly url = process.env.N8N_NOTIFY_WEBHOOK_URL;

  async send(message: OutgoingMessage): Promise<void> {
    if (!this.url) throw new Error('N8N_NOTIFY_WEBHOOK_URL no está configurado');
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY ?? 'dev-internal-key',
      },
      body: JSON.stringify({
        chatId: message.chatId,
        text: message.text,
        parseMode: 'HTML',
        type: message.type,
        notificationId: message.notificationId,
        inlineKeyboard: message.buttons.map((b) => [{ text: b.text, callback_data: b.callbackData }]),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) throw new Error('El flujo de notificaciones de n8n no está activo (webhook 404)');
    if (!res.ok) throw new Error(`n8n respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

@Injectable()
export class HttpContactDirectory implements ContactDirectory {
  private readonly baseUrl = process.env.USERS_URL ?? 'http://localhost:3001';

  async find(userId: string) {
    const res = await fetch(`${this.baseUrl}/internal/users/${encodeURIComponent(userId)}/contact`, {
      headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? 'dev-internal-key' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`users-service respondió ${res.status}`);
    const data = (await res.json()) as { id: string; name: string; email: string; telegramChatId: string | null };
    return { userId: data.id, name: data.name, email: data.email, telegramChatId: data.telegramChatId };
  }
}
