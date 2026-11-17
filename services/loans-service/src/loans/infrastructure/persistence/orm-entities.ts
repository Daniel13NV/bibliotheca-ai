import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** DECIMAL de MySQL llega como string: lo convertimos a number. */
const decimal = {
  to: (value: number) => value,
  from: (value: string | number | null) => (value === null ? 0 : Number(value)),
};

@Entity('loans')
export class LoanOrmEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @Column({ name: 'user_name', length: 120 })
  userName: string;

  @Column({ name: 'borrower_role', length: 20 })
  borrowerRole: string;

  @Index()
  @Column({ name: 'copy_id', type: 'char', length: 36 })
  copyId: string;

  @Column({ name: 'copy_code', length: 20 })
  copyCode: string;

  @Index()
  @Column({ name: 'copy_epc', type: 'varchar', length: 32, nullable: true })
  copyEpc: string | null;

  @Column({ name: 'book_id', type: 'char', length: 36 })
  bookId: string;

  @Column({ name: 'book_title', length: 255 })
  bookTitle: string;

  @Index()
  @Column({ name: 'loaned_at', type: 'datetime' })
  loanedAt: Date;

  @Index()
  @Column({ name: 'due_date', type: 'datetime' })
  dueDate: Date;

  @Column({ name: 'returned_at', type: 'datetime', nullable: true })
  returnedAt: Date | null;

  @Column({ name: 'return_channel', type: 'varchar', length: 20, nullable: true })
  returnChannel: string | null;

  @Column({ type: 'int', default: 0 })
  renewals: number;

  @Index()
  @Column({ length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'checked_out_by', type: 'char', length: 36 })
  checkedOutBy: string;
}

@Entity('penalties')
export class PenaltyOrmEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @Column({ name: 'user_name', length: 120 })
  userName: string;

  @Index()
  @Column({ name: 'loan_id', type: 'char', length: 36 })
  loanId: string;

  @Column({ name: 'book_title', length: 255 })
  bookTitle: string;

  @Column({ name: 'days_late', type: 'int' })
  daysLate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimal })
  amount: number;

  @Index()
  @Column({ length: 20, default: 'PENDING' })
  status: string;

  @Column({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'settled_at', type: 'datetime', nullable: true })
  settledAt: Date | null;

  @Column({ name: 'settled_by', type: 'varchar', length: 120, nullable: true })
  settledBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
