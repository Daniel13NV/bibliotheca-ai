import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel, NotificationStatus } from '../../domain/notification';
import { NotificationRepository, Recipient, RecipientRepository } from '../../domain/ports';
import { NotificationOrmEntity, RecipientOrmEntity } from './orm-entities';

@Injectable()
export class TypeOrmRecipientRepository implements RecipientRepository {
  constructor(@InjectRepository(RecipientOrmEntity) private readonly repo: Repository<RecipientOrmEntity>) {}

  findById(userId: string): Promise<Recipient | null> {
    return this.repo.findOneBy({ userId });
  }

  async save(recipient: Recipient) {
    await this.repo.save(this.repo.create(recipient));
  }
}

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(@InjectRepository(NotificationOrmEntity) private readonly repo: Repository<NotificationOrmEntity>) {}

  private toDomain = (row: NotificationOrmEntity) =>
    Notification.restore({
      ...row,
      buttons: row.buttons ?? [],
      channel: row.channel as NotificationChannel,
      status: row.status as NotificationStatus,
    });

  async findById(id: string) {
    const row = await this.repo.findOneBy({ id });
    return row ? this.toDomain(row) : null;
  }

  async findByUser(userId: string, limit: number) {
    return (await this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: limit })).map(this.toDomain);
  }

  countUnread(userId: string) {
    return this.repo.countBy({ userId, read: false });
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, read: false }, { read: true });
  }

  async save(notification: Notification) {
    await this.repo.save(this.repo.create(notification.snapshot()));
  }
}
