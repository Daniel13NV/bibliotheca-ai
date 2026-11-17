import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('recipients')
export class RecipientOrmEntity {
  @PrimaryColumn('char', { name: 'user_id', length: 36 })
  userId: string;

  @Column({ length: 120, default: '' })
  name: string;

  @Column({ length: 160, default: '' })
  email: string;

  @Column({ name: 'telegram_chat_id', type: 'varchar', length: 40, nullable: true })
  telegramChatId: string | null;

  @Column({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
export class NotificationOrmEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
  userId: string | null;

  @Column({ name: 'chat_id', type: 'varchar', length: 40, nullable: true })
  chatId: string | null;

  @Column({ length: 60 })
  type: string;

  @Column({ length: 160 })
  title: string;

  @Column('text')
  body: string;

  @Column('simple-json')
  buttons: Array<{ text: string; callbackData: string }>;

  @Column({ length: 20 })
  channel: string;

  @Index()
  @Column({ length: 20 })
  status: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  error: string | null;

  @Column({ name: 'is_read', default: false })
  read: boolean;

  @Column({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt: Date | null;
}
