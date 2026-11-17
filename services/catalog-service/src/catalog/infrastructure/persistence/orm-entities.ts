import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('books')
export class BookOrmEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 13, nullable: true })
  isbn: string | null;

  @Index()
  @Column({ length: 255 })
  title: string;

  @Column('simple-json')
  authors: string[];

  @Column({ type: 'varchar', length: 160, nullable: true })
  publisher: string | null;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Index()
  @Column({ length: 80 })
  category: string;

  @Column({ length: 40, default: 'Español' })
  language: string;

  @Column('text')
  synopsis: string;

  @Column({ name: 'cover_url', type: 'varchar', length: 500, nullable: true })
  coverUrl: string | null;

  @Column({ type: 'int', nullable: true })
  pages: number | null;

  @Column('simple-json')
  tags: string[];

  @Column({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

@Entity('copies')
export class CopyOrmEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Index()
  @Column({ name: 'book_id', type: 'char', length: 36 })
  bookId: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  code: string;

  @Index({ unique: true })
  @Column({ name: 'rfid_epc', type: 'varchar', length: 32, nullable: true })
  rfidEpc: string | null;

  @Index()
  @Column({ length: 20, default: 'AVAILABLE' })
  status: string;

  @Column({ length: 80 })
  zone: string;

  @Column({ length: 20 })
  shelf: string;

  @Column({ name: 'last_seen_at', type: 'datetime', nullable: true })
  lastSeenAt: Date | null;

  @Column({ name: 'last_seen_reader_id', type: 'varchar', length: 40, nullable: true })
  lastSeenReaderId: string | null;

  @Column({ name: 'last_seen_zone', type: 'varchar', length: 80, nullable: true })
  lastSeenZone: string | null;

  @Column({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

@Entity('security_alerts')
export class SecurityAlertOrmEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ name: 'copy_id', type: 'char', length: 36 })
  copyId: string;

  @Column({ name: 'book_id', type: 'char', length: 36 })
  bookId: string;

  @Column({ name: 'book_title', length: 255 })
  bookTitle: string;

  @Column({ name: 'copy_code', length: 20 })
  copyCode: string;

  @Column({ length: 32 })
  epc: string;

  @Column({ name: 'reader_id', length: 40 })
  readerId: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  zone: string | null;

  @Column({ name: 'copy_status', length: 20 })
  copyStatus: string;

  @Index()
  @Column({ name: 'detected_at', type: 'datetime' })
  detectedAt: Date;

  @Index()
  @Column({ length: 20, default: 'OPEN' })
  status: string;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', type: 'varchar', length: 120, nullable: true })
  resolvedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
