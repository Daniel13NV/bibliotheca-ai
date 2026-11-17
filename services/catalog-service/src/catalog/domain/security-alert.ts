export type AlertStatus = 'OPEN' | 'RESOLVED';

export interface SecurityAlertProps {
  id: string;
  copyId: string;
  bookId: string;
  bookTitle: string;
  copyCode: string;
  epc: string;
  readerId: string;
  zone: string | null;
  copyStatus: string;
  detectedAt: Date;
  status: AlertStatus;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  notes: string | null;
}

/** Salida no autorizada detectada por el arco RFID. */
export class SecurityAlert {
  private constructor(private props: SecurityAlertProps) {}

  static raise(input: Omit<SecurityAlertProps, 'status' | 'resolvedAt' | 'resolvedBy' | 'notes'>): SecurityAlert {
    return new SecurityAlert({ ...input, status: 'OPEN', resolvedAt: null, resolvedBy: null, notes: null });
  }

  static restore(props: SecurityAlertProps): SecurityAlert {
    return new SecurityAlert({ ...props });
  }

  get id() { return this.props.id; }

  resolve(by: string, notes: string | null, now: Date): void {
    this.props.status = 'RESOLVED';
    this.props.resolvedAt = now;
    this.props.resolvedBy = by;
    this.props.notes = notes;
  }

  snapshot(): SecurityAlertProps {
    return { ...this.props };
  }
}
