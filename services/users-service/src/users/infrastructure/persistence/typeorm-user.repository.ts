import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Role } from '../../../shared/roles';
import { UserRepository } from '../../domain/ports';
import { User } from '../../domain/user';
import { UserOrmEntity } from './user.orm-entity';

/** Adaptador de persistencia: traduce entre el agregado User y la tabla MySQL. */
@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(@InjectRepository(UserOrmEntity) private readonly repo: Repository<UserOrmEntity>) {}

  private toDomain(row: UserOrmEntity | null): User | null {
    if (!row) return null;
    return User.restore({
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role as Role,
      studentId: row.studentId,
      telegramChatId: row.telegramChatId,
      telegramUsername: row.telegramUsername,
      telegramLinkCode: row.telegramLinkCode,
      telegramLinkExpiresAt: row.telegramLinkExpiresAt,
      active: row.active,
      createdAt: row.createdAt,
    });
  }

  findById(id: string) {
    return this.repo.findOneBy({ id }).then((r) => this.toDomain(r));
  }

  findByEmail(email: string) {
    return this.repo.findOneBy({ email }).then((r) => this.toDomain(r));
  }

  findByStudentId(studentId: string) {
    return this.repo.findOneBy({ studentId }).then((r) => this.toDomain(r));
  }

  findByTelegramChatId(chatId: string) {
    return this.repo.findOneBy({ telegramChatId: chatId }).then((r) => this.toDomain(r));
  }

  findByTelegramLinkCode(code: string) {
    return this.repo.findOneBy({ telegramLinkCode: code }).then((r) => this.toDomain(r));
  }

  async list(filter: { role?: Role; search?: string }): Promise<User[]> {
    const base = filter.role ? { role: filter.role } : {};
    const where = filter.search
      ? [
          { ...base, name: Like(`%${filter.search}%`) },
          { ...base, email: Like(`%${filter.search}%`) },
          { ...base, studentId: Like(`%${filter.search.toUpperCase()}%`) },
        ]
      : base;
    const rows = await this.repo.find({ where, order: { name: 'ASC' }, take: 200 });
    return rows.map((r) => this.toDomain(r)!);
  }

  async save(user: User): Promise<void> {
    await this.repo.save(this.repo.create(user.snapshot()));
  }

  count(): Promise<number> {
    return this.repo.count();
  }
}
