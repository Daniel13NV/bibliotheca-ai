export type NotificationChannel = 'TELEGRAM' | 'IN_APP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface NotificationButton {
  text: string;
  callbackData: string;
}

export interface NotificationProps {
  id: string;
  userId: string | null; // null = aviso para el personal (grupo de alertas)
  chatId: string | null;
  type: string;
  title: string;
  body: string;
  buttons: NotificationButton[];
  channel: NotificationChannel;
  status: NotificationStatus;
  error: string | null;
  read: boolean;
  createdAt: Date;
  sentAt: Date | null;
}

/** Notificación generada a partir de un evento de dominio. Siempre queda en la bandeja de la app. */
export class Notification {
  private constructor(private props: NotificationProps) {}

  static create(input: { id: string; userId: string | null; chatId: string | null; type: string; title: string; body: string; buttons: NotificationButton[] }, now: Date): Notification {
    return new Notification({
      ...input,
      channel: input.chatId ? 'TELEGRAM' : 'IN_APP',
      status: input.chatId ? 'PENDING' : 'SKIPPED',
      error: input.chatId ? null : 'Usuario sin Telegram vinculado (solo bandeja de la app)',
      read: false,
      createdAt: now,
      sentAt: null,
    });
  }

  static restore(props: NotificationProps): Notification {
    return new Notification({ ...props, buttons: [...props.buttons] });
  }

  get id() { return this.props.id; }
  get userId() { return this.props.userId; }
  get chatId() { return this.props.chatId; }
  get shouldDeliver() { return this.props.status === 'PENDING' && Boolean(this.props.chatId); }

  markSent(now: Date): void {
    this.props.status = 'SENT';
    this.props.sentAt = now;
    this.props.error = null;
  }

  markFailed(error: string): void {
    this.props.status = 'FAILED';
    this.props.error = error.slice(0, 500);
  }

  markRead(): void {
    this.props.read = true;
  }

  /** Mensaje con formato HTML para Telegram. */
  telegramText(): string {
    return `<b>${this.props.title}</b>\n${this.props.body}`;
  }

  view() {
    const p = this.props;
    return {
      id: p.id,
      type: p.type,
      title: p.title,
      body: p.body.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
      channel: p.channel,
      status: p.status,
      error: p.error,
      read: p.read,
      createdAt: p.createdAt.toISOString(),
      sentAt: p.sentAt?.toISOString() ?? null,
    };
  }

  snapshot(): NotificationProps {
    return { ...this.props, buttons: [...this.props.buttons] };
  }
}
