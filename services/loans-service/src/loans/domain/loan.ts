import { DomainError } from '../../shared/domain-error';
import { Role } from '../../shared/roles';
import { addDays, DAY_MS, endOfDay, LoanPolicy } from './loan-policy';
import { calculateFine, FineResult } from './penalty-calculator';

export type LoanStatus = 'ACTIVE' | 'RETURNED';
export type LoanDisplayStatus = 'ACTIVE' | 'DUE_SOON' | 'OVERDUE' | 'RETURNED';
export type ReturnChannel = 'DESK' | 'APP' | 'RFID_RETURN_BOX';

export interface LoanProps {
  id: string;
  userId: string;
  userName: string;
  borrowerRole: Role;
  copyId: string;
  copyCode: string;
  copyEpc: string | null;
  bookId: string;
  bookTitle: string;
  loanedAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  returnChannel: ReturnChannel | null;
  renewals: number;
  status: LoanStatus;
  checkedOutBy: string;
}

/** Agregado raíz del contexto de préstamos. */
export class Loan {
  private constructor(private props: LoanProps) {}

  static open(
    input: Omit<LoanProps, 'loanedAt' | 'dueDate' | 'returnedAt' | 'returnChannel' | 'renewals' | 'status'>,
    policy: LoanPolicy,
    now: Date,
  ): Loan {
    return new Loan({
      ...input,
      loanedAt: now,
      dueDate: endOfDay(addDays(now, policy.loanDays[input.borrowerRole])),
      returnedAt: null,
      returnChannel: null,
      renewals: 0,
      status: 'ACTIVE',
    });
  }

  static restore(props: LoanProps): Loan {
    return new Loan({ ...props });
  }

  get id() { return this.props.id; }
  get userId() { return this.props.userId; }
  get copyId() { return this.props.copyId; }
  get bookTitle() { return this.props.bookTitle; }
  get dueDate() { return this.props.dueDate; }
  get renewals() { return this.props.renewals; }
  get status() { return this.props.status; }

  isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  isOverdue(now: Date): boolean {
    return this.isActive() && now.getTime() > this.props.dueDate.getTime();
  }

  /** Días completos que faltan para el vencimiento (0 = vence hoy, negativo = vencido). */
  daysUntilDue(now: Date): number {
    return Math.floor((this.props.dueDate.getTime() - now.getTime()) / DAY_MS);
  }

  displayStatus(now: Date, dueSoonDays = 2): LoanDisplayStatus {
    if (!this.isActive()) return 'RETURNED';
    if (this.isOverdue(now)) return 'OVERDUE';
    return this.daysUntilDue(now) <= dueSoonDays ? 'DUE_SOON' : 'ACTIVE';
  }

  /** Renovación: no vencido, sin multas pendientes y dentro del máximo de renovaciones. */
  renew(policy: LoanPolicy, now: Date, hasPendingPenalties: boolean): void {
    if (!this.isActive()) throw DomainError.rule('El préstamo ya fue devuelto');
    if (this.isOverdue(now)) throw DomainError.rule('No se puede renovar un préstamo vencido; devuélvelo en el mostrador');
    if (hasPendingPenalties) throw DomainError.rule('Tienes multas pendientes; págalas para poder renovar');
    if (this.props.renewals >= policy.maxRenewals) {
      throw DomainError.rule(`Alcanzaste el máximo de ${policy.maxRenewals} renovaciones para este libro`);
    }
    this.props.dueDate = endOfDay(addDays(this.props.dueDate, policy.renewalDays));
    this.props.renewals += 1;
  }

  /** Cierra el préstamo y devuelve la multa generada (si hubo atraso). */
  close(now: Date, channel: ReturnChannel, policy: LoanPolicy): FineResult {
    if (!this.isActive()) throw DomainError.rule('El préstamo ya fue devuelto');
    const fine = calculateFine(this.props.dueDate, now, policy);
    this.props.status = 'RETURNED';
    this.props.returnedAt = now;
    this.props.returnChannel = channel;
    return fine;
  }

  accruedFine(now: Date, policy: LoanPolicy): FineResult {
    return this.isActive() ? calculateFine(this.props.dueDate, now, policy) : { daysLate: 0, amount: 0 };
  }

  view(now: Date, policy: LoanPolicy) {
    const p = this.props;
    return {
      id: p.id,
      userId: p.userId,
      userName: p.userName,
      copyId: p.copyId,
      copyCode: p.copyCode,
      bookId: p.bookId,
      bookTitle: p.bookTitle,
      loanedAt: p.loanedAt.toISOString(),
      dueDate: p.dueDate.toISOString(),
      returnedAt: p.returnedAt?.toISOString() ?? null,
      returnChannel: p.returnChannel,
      renewals: p.renewals,
      renewalsLeft: Math.max(0, policy.maxRenewals - p.renewals),
      status: this.displayStatus(now),
      daysUntilDue: this.isActive() ? this.daysUntilDue(now) : null,
      accruedFine: this.accruedFine(now, policy).amount,
    };
  }

  snapshot(): LoanProps {
    return { ...this.props };
  }
}
