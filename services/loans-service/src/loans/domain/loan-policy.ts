import { Role } from '../../shared/roles';

/** Reglas configurables del reglamento de la biblioteca. */
export interface LoanPolicy {
  loanDays: Record<Role, number>;
  maxActiveLoans: Record<Role, number>;
  maxRenewals: number;
  renewalDays: number;
  dailyFine: number;
  maxFinePerLoan: number;
  currency: string;
}

export const DEFAULT_LOAN_POLICY: LoanPolicy = {
  loanDays: { STUDENT: 7, LIBRARIAN: 14, ADMIN: 14 },
  maxActiveLoans: { STUDENT: 3, LIBRARIAN: 10, ADMIN: 10 },
  maxRenewals: 2,
  renewalDays: 7,
  dailyFine: 5,
  maxFinePerLoan: 150,
  currency: 'MXN',
};

export const DAY_MS = 86_400_000;

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** La fecha límite siempre es al final del día (23:59:59.999, hora local del servidor). */
export function endOfDay(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(23, 59, 59, 999);
  return copy;
}
