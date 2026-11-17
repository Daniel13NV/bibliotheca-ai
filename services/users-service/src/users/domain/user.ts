import { DomainError } from '../../shared/domain-error';
import { Role } from '../../shared/roles';

export interface UserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  studentId: string | null;
  telegramChatId: string | null;
  telegramUsername: string | null;
  telegramLinkCode: string | null;
  telegramLinkExpiresAt: Date | null;
  active: boolean;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId: string | null;
  telegramLinked: boolean;
  telegramUsername: string | null;
  createdAt: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TELEGRAM_CODE_TTL_MINUTES = 15;

/** Agregado raíz del contexto de identidad. */
export class User {
  private constructor(private props: UserProps) {}

  static register(
    input: { id: string; name: string; email: string; passwordHash: string; role?: Role; studentId?: string | null },
    now: Date,
  ): User {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (name.length < 3) throw DomainError.validation('El nombre debe tener al menos 3 caracteres');
    if (!EMAIL_REGEX.test(email)) throw DomainError.validation('Correo electrónico inválido');
    const studentId = input.studentId?.trim().toUpperCase() || null;
    return new User({
      id: input.id,
      name,
      email,
      passwordHash: input.passwordHash,
      role: input.role ?? 'STUDENT',
      studentId,
      telegramChatId: null,
      telegramUsername: null,
      telegramLinkCode: null,
      telegramLinkExpiresAt: null,
      active: true,
      createdAt: now,
    });
  }

  static restore(props: UserProps): User {
    return new User({ ...props });
  }

  get id() { return this.props.id; }
  get name() { return this.props.name; }
  get email() { return this.props.email; }
  get role() { return this.props.role; }
  get passwordHash() { return this.props.passwordHash; }
  get studentId() { return this.props.studentId; }
  get telegramChatId() { return this.props.telegramChatId; }
  get active() { return this.props.active; }

  changeRole(role: Role): void {
    this.props.role = role;
  }

  deactivate(): void {
    this.props.active = false;
  }

  /** Genera un código de un solo uso para vincular la cuenta con el bot de Telegram. */
  issueTelegramLinkCode(code: string, now: Date): Date {
    const expiresAt = new Date(now.getTime() + TELEGRAM_CODE_TTL_MINUTES * 60_000);
    this.props.telegramLinkCode = code;
    this.props.telegramLinkExpiresAt = expiresAt;
    return expiresAt;
  }

  linkTelegram(code: string, chatId: string, username: string | null, now: Date): void {
    if (!this.props.telegramLinkCode || this.props.telegramLinkCode !== code) {
      throw DomainError.rule('Código de vinculación inválido');
    }
    if (!this.props.telegramLinkExpiresAt || this.props.telegramLinkExpiresAt.getTime() < now.getTime()) {
      throw DomainError.rule('El código de vinculación expiró, genera uno nuevo desde la app');
    }
    this.props.telegramChatId = chatId;
    this.props.telegramUsername = username;
    this.props.telegramLinkCode = null;
    this.props.telegramLinkExpiresAt = null;
  }

  unlinkTelegram(): void {
    this.props.telegramChatId = null;
    this.props.telegramUsername = null;
  }

  toPublic(): PublicUser {
    return {
      id: this.props.id,
      name: this.props.name,
      email: this.props.email,
      role: this.props.role,
      studentId: this.props.studentId,
      telegramLinked: Boolean(this.props.telegramChatId),
      telegramUsername: this.props.telegramUsername,
      createdAt: this.props.createdAt.toISOString(),
    };
  }

  snapshot(): UserProps {
    return { ...this.props };
  }
}
