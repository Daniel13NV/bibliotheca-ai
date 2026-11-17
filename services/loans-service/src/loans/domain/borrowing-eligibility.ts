import { DomainError } from '../../shared/domain-error';
import { Role } from '../../shared/roles';
import { Loan } from './loan';
import { LoanPolicy } from './loan-policy';

/**
 * Servicio de dominio: ¿puede esta persona llevarse otro libro?
 *  1. Sin préstamos vencidos.
 *  2. Sin multas pendientes.
 *  3. Por debajo del máximo de préstamos simultáneos de su rol.
 */
export function assertCanBorrow(
  input: { role: Role; activeLoans: Loan[]; pendingPenaltiesTotal: number },
  policy: LoanPolicy,
  now: Date,
): void {
  const overdue = input.activeLoans.filter((l) => l.isOverdue(now));
  if (overdue.length > 0) {
    throw DomainError.rule(`Tienes ${overdue.length} préstamo(s) vencido(s); devuélvelos antes de pedir otro`, {
      overdue: overdue.map((l) => l.bookTitle),
    });
  }
  if (input.pendingPenaltiesTotal > 0) {
    throw DomainError.rule(
      `Tienes multas pendientes por $${input.pendingPenaltiesTotal.toFixed(2)} ${policy.currency}`,
      { pendingPenaltiesTotal: input.pendingPenaltiesTotal },
    );
  }
  const max = policy.maxActiveLoans[input.role];
  if (input.activeLoans.length >= max) {
    throw DomainError.rule(`Alcanzaste el máximo de ${max} préstamos simultáneos`);
  }
}
