import { Inject, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { DomainError } from '../../shared/domain-error';
import { EVENT_PUBLISHER, EventPublisher } from '../../shared/event-publisher.port';
import { USER_REPOSITORY, UserRepository } from '../domain/ports';
import { PublicUser } from '../domain/user';

export interface TelegramLinkCode {
  code: string;
  expiresAt: string;
  botUsername: string;
  deepLink: string;
  instructions: string;
}

/** Genera el código que el estudiante envía al bot: /start 123456 */
@Injectable()
export class CreateTelegramLinkCodeUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(userId: string): Promise<TelegramLinkCode> {
    const user = await this.users.findById(userId);
    if (!user) throw DomainError.notFound('Usuario');

    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      code = String(randomInt(100000, 1000000));
      if (!(await this.users.findByTelegramLinkCode(code))) break;
    }
    const expiresAt = user.issueTelegramLinkCode(code, new Date());
    await this.users.save(user);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'BibliothecaAIBot';
    return {
      code,
      expiresAt: expiresAt.toISOString(),
      botUsername,
      deepLink: `https://t.me/${botUsername}?start=${code}`,
      instructions: `Abre @${botUsername} en Telegram y envía: /start ${code}`,
    };
  }
}

/** Lo invoca n8n cuando el bot recibe "/start <código>". */
@Injectable()
export class LinkTelegramAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(input: { code: string; chatId: string; username?: string | null }): Promise<PublicUser> {
    const user = await this.users.findByTelegramLinkCode(input.code.trim());
    if (!user) throw DomainError.rule('Código de vinculación inválido o ya utilizado');

    // Un chat de Telegram solo puede pertenecer a una cuenta.
    const previous = await this.users.findByTelegramChatId(input.chatId);
    if (previous && previous.id !== user.id) {
      previous.unlinkTelegram();
      await this.users.save(previous);
    }

    user.linkTelegram(input.code.trim(), input.chatId, input.username ?? null, new Date());
    await this.users.save(user);
    await this.events.publish('user.telegram_linked', {
      userId: user.id,
      name: user.name,
      chatId: input.chatId,
    });
    return user.toPublic();
  }
}

@Injectable()
export class UnlinkTelegramUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw DomainError.notFound('Usuario');
    user.unlinkTelegram();
    await this.users.save(user);
    return user.toPublic();
  }
}

/** Resuelve qué usuario está detrás de un chat de Telegram (lo usa el bot). */
@Injectable()
export class FindUserByTelegramUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(chatId: string): Promise<{ linked: boolean; user: PublicUser | null }> {
    const user = await this.users.findByTelegramChatId(chatId);
    return { linked: Boolean(user), user: user ? user.toPublic() : null };
  }
}
