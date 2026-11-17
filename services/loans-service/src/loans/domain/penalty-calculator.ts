import { DAY_MS, LoanPolicy } from './loan-policy';

export interface FineResult {
  daysLate: number;
  amount: number;
}

/** Días de atraso: cualquier fracción de día después del vencimiento cuenta como día completo. */
export function daysLate(dueDate: Date, at: Date): number {
  const diff = at.getTime() - dueDate.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / DAY_MS);
}

/** Multa = días de atraso × tarifa diaria, con tope por préstamo. */
export function calculateFine(dueDate: Date, at: Date, policy: LoanPolicy): FineResult {
  const late = daysLate(dueDate, at);
  return { daysLate: late, amount: Math.min(late * policy.dailyFine, policy.maxFinePerLoan) };
}
