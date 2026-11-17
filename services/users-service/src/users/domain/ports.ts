import { Role } from '../../shared/roles';
import { User } from './user';

/** Puertos de salida del contexto de identidad (implementados en infrastructure/). */

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByStudentId(studentId: string): Promise<User | null>;
  findByTelegramChatId(chatId: string): Promise<User | null>;
  findByTelegramLinkCode(code: string): Promise<User | null>;
  list(filter: { role?: Role; search?: string }): Promise<User[]>;
  save(user: User): Promise<void>;
  count(): Promise<number>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');
export interface IssuedToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}
export interface TokenIssuer {
  issue(user: User): Promise<IssuedToken>;
}
