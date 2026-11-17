import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../shared/domain-error';
import { EVENT_PUBLISHER, EventPublisher } from '../../shared/event-publisher.port';
import { Role } from '../../shared/roles';
import { USER_REPOSITORY, UserRepository } from '../domain/ports';
import { PublicUser } from '../domain/user';

@Injectable()
export class GetUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(id: string): Promise<PublicUser> {
    const user = await this.users.findById(id);
    if (!user) throw DomainError.notFound('Usuario');
    return user.toPublic();
  }

  /** Datos de contacto para el servicio de notificaciones (incluye el chat de Telegram). */
  async contact(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw DomainError.notFound('Usuario');
    return { ...user.toPublic(), telegramChatId: user.telegramChatId };
  }

  async byStudentId(studentId: string): Promise<PublicUser> {
    const user = await this.users.findByStudentId(studentId.trim().toUpperCase());
    if (!user) throw DomainError.notFound(`Usuario con matrícula ${studentId}`);
    return user.toPublic();
  }
}

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(filter: { role?: Role; search?: string }): Promise<PublicUser[]> {
    return (await this.users.list(filter)).map((u) => u.toPublic());
  }
}

@Injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(actorId: string, userId: string, role: Role): Promise<PublicUser> {
    if (actorId === userId) throw DomainError.rule('No puedes cambiar tu propio rol');
    const user = await this.users.findById(userId);
    if (!user) throw DomainError.notFound('Usuario');
    user.changeRole(role);
    await this.users.save(user);
    await this.events.publish('user.role_changed', { userId, role });
    return user.toPublic();
  }
}
