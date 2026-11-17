import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainError } from '../../shared/domain-error';
import { EVENT_PUBLISHER, EventPublisher } from '../../shared/event-publisher.port';
import { Role } from '../../shared/roles';
import {
  IssuedToken,
  PASSWORD_HASHER,
  PasswordHasher,
  TOKEN_ISSUER,
  TokenIssuer,
  USER_REPOSITORY,
  UserRepository,
} from '../domain/ports';
import { PublicUser, User } from '../domain/user';

export interface AuthResult extends IssuedToken {
  user: PublicUser;
}

export const MIN_PASSWORD_LENGTH = 8;

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(input: {
    name: string;
    email: string;
    password: string;
    studentId?: string;
    role?: Role;
  }): Promise<AuthResult> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw DomainError.validation(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    if (await this.users.findByEmail(input.email.trim().toLowerCase())) {
      throw DomainError.conflict('Ya existe una cuenta con ese correo');
    }
    if (input.studentId && (await this.users.findByStudentId(input.studentId.trim().toUpperCase()))) {
      throw DomainError.conflict('Esa matrícula ya está registrada');
    }

    const user = User.register(
      {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        passwordHash: await this.hasher.hash(input.password),
        studentId: input.studentId,
        role: input.role,
      },
      new Date(),
    );
    await this.users.save(user);
    await this.events.publish('user.registered', {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
    });

    return { ...(await this.tokens.issue(user)), user: user.toPublic() };
  }
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
  ) {}

  async execute(input: { email: string; password: string }): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    if (!user || !(await this.hasher.verify(input.password, user.passwordHash))) {
      throw DomainError.unauthorized('Correo o contraseña incorrectos');
    }
    if (!user.active) throw DomainError.forbidden('La cuenta está desactivada');
    return { ...(await this.tokens.issue(user)), user: user.toPublic() };
  }
}
