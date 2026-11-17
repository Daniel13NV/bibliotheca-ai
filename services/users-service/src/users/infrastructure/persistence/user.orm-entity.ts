import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('users')
export class UserOrmEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ length: 120 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 160 })
  email: string;

  @Column({ name: 'password_hash', length: 100 })
  passwordHash: string;

  @Column({ length: 20, default: 'STUDENT' })
  role: string;

  @Index({ unique: true })
  @Column({ name: 'student_id', type: 'varchar', length: 30, nullable: true })
  studentId: string | null;

  @Index({ unique: true })
  @Column({ name: 'telegram_chat_id', type: 'varchar', length: 40, nullable: true })
  telegramChatId: string | null;

  @Column({ name: 'telegram_username', type: 'varchar', length: 64, nullable: true })
  telegramUsername: string | null;

  @Index()
  @Column({ name: 'telegram_link_code', type: 'varchar', length: 10, nullable: true })
  telegramLinkCode: string | null;

  @Column({ name: 'telegram_link_expires_at', type: 'datetime', nullable: true })
  telegramLinkExpiresAt: Date | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
