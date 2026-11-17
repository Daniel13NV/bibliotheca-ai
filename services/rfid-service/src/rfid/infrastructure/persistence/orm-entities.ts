import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('readers')
export class ReaderOrmEntity {
  @PrimaryColumn({ length: 40 })
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 80 })
  zone: string;

  @Column({ length: 160 })
  location: string;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'last_heartbeat_at', type: 'datetime', nullable: true })
  lastHeartbeatAt: Date | null;

  @Column({ name: 'last_read_at', type: 'datetime', nullable: true })
  lastReadAt: Date | null;

  @Column({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

/** Serie temporal de lecturas (telemetría). */
@Entity('tag_reads')
@Index(['readerId', 'readAt'])
export class TagReadOrmEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ name: 'reader_id', length: 40 })
  readerId: string;

  @Index()
  @Column({ length: 32 })
  epc: string;

  @Column({ type: 'int', nullable: true })
  rssi: number | null;

  @Column({ type: 'int', nullable: true })
  antenna: number | null;

  @Index()
  @Column({ name: 'read_at', type: 'datetime', precision: 3 })
  readAt: Date;
}
