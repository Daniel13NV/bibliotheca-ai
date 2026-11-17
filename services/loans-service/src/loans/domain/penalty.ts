import { DomainError } from '../../shared/domain-error';

export type PenaltyStatus = 'PENDING' | 'PAID' | 'WAIVED';

export interface PenaltyProps {
  id: string;
  userId: string;
  userName: string;
  loanId: string;
  bookTitle: string;
  daysLate: number;
  amount: number;
  status: PenaltyStatus;
  createdAt: Date;
  settledAt: Date | null;
  settledBy: string | null;
  notes: string | null;
}

/** Sanción económica generada por devolución tardía. */
export class Penalty {
  private constructor(private props: PenaltyProps) {}

  static create(input: Omit<PenaltyProps, 'status' | 'settledAt' | 'settledBy' | 'notes'>): Penalty {
    if (input.amount <= 0) throw DomainError.validation('El monto de la multa debe ser mayor a cero');
    return new Penalty({ ...input, status: 'PENDING', settledAt: null, settledBy: null, notes: null });
  }

  static restore(props: PenaltyProps): Penalty {
    return new Penalty({ ...props });
  }

  get id() { return this.props.id; }
  get userId() { return this.props.userId; }
  get amount() { return this.props.amount; }
  get status() { return this.props.status; }

  pay(by: string, now: Date): void {
    if (this.props.status !== 'PENDING') throw DomainError.rule('La multa ya fue liquidada');
    this.props.status = 'PAID';
    this.props.settledAt = now;
    this.props.settledBy = by;
  }

  waive(by: string, reason: string, now: Date): void {
    if (this.props.status !== 'PENDING') throw DomainError.rule('La multa ya fue liquidada');
    if (!reason?.trim()) throw DomainError.validation('Indica el motivo de la condonación');
    this.props.status = 'WAIVED';
    this.props.settledAt = now;
    this.props.settledBy = by;
    this.props.notes = reason.trim();
  }

  view() {
    const p = this.props;
    return {
      ...p,
      createdAt: p.createdAt.toISOString(),
      settledAt: p.settledAt?.toISOString() ?? null,
    };
  }

  snapshot(): PenaltyProps {
    return { ...this.props };
  }
}
