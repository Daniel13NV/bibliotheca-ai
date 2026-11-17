import { assertCanBorrow } from './borrowing-eligibility';
import { Loan } from './loan';
import { DEFAULT_LOAN_POLICY as policy } from './loan-policy';
import { calculateFine, daysLate } from './penalty-calculator';

const at = (iso: string) => new Date(iso);

function openLoan(now: Date, role: 'STUDENT' | 'LIBRARIAN' = 'STUDENT') {
  return Loan.open(
    {
      id: 'l1',
      userId: 'u1',
      userName: 'Daniel',
      borrowerRole: role,
      copyId: 'c1',
      copyCode: 'BIB-00301',
      copyEpc: 'E00401500000012D',
      bookId: 'b1',
      bookTitle: 'Siete breves lecciones de física',
      checkedOutBy: 'u1',
    },
    policy,
    now,
  );
}

describe('Cálculo de multas', () => {
  const due = at('2026-11-10T23:59:59.999');

  it('no cobra si se devuelve a tiempo', () => {
    expect(calculateFine(due, at('2026-11-10T18:00:00'), policy)).toEqual({ daysLate: 0, amount: 0 });
  });

  it('cuenta cualquier fracción de día como día completo', () => {
    expect(daysLate(due, at('2026-11-11T09:00:00'))).toBe(1);
    expect(daysLate(due, at('2026-11-13T09:00:00'))).toBe(3);
  });

  it('cobra $5 por día con tope de $150', () => {
    expect(calculateFine(due, at('2026-11-14T09:00:00'), policy).amount).toBe(20);
    expect(calculateFine(due, at('2027-01-30T09:00:00'), policy).amount).toBe(150);
  });
});

describe('Préstamo', () => {
  const now = at('2026-11-02T10:00:00');

  it('vence al final del día según el rol', () => {
    expect(openLoan(now).dueDate.getDate()).toBe(9);
    expect(openLoan(now, 'LIBRARIAN').dueDate.getDate()).toBe(16);
    expect(openLoan(now).dueDate.getHours()).toBe(23);
  });

  it('renueva sumando días a la fecha límite', () => {
    const loan = openLoan(now);
    loan.renew(policy, at('2026-11-05T10:00:00'), false);
    expect(loan.dueDate.getDate()).toBe(16);
    expect(loan.renewals).toBe(1);
  });

  it('no renueva si está vencido, con multas o sin renovaciones disponibles', () => {
    expect(() => openLoan(now).renew(policy, at('2026-11-12T10:00:00'), false)).toThrow('vencido');
    expect(() => openLoan(now).renew(policy, now, true)).toThrow('multas');
    const loan = openLoan(now);
    loan.renew(policy, now, false);
    loan.renew(policy, now, false);
    expect(() => loan.renew(policy, now, false)).toThrow('máximo');
  });

  it('al devolver tarde genera la multa', () => {
    const loan = openLoan(now);
    const fine = loan.close(at('2026-11-12T10:00:00'), 'DESK', policy);
    expect(fine).toEqual({ daysLate: 3, amount: 15 });
    expect(loan.isActive()).toBe(false);
  });

  it('marca DUE_SOON y OVERDUE', () => {
    const loan = openLoan(now);
    expect(loan.displayStatus(at('2026-11-03T10:00:00'))).toBe('ACTIVE');
    expect(loan.displayStatus(at('2026-11-08T10:00:00'))).toBe('DUE_SOON');
    expect(loan.displayStatus(at('2026-11-10T10:00:00'))).toBe('OVERDUE');
  });
});

describe('Elegibilidad para préstamo', () => {
  const now = at('2026-11-02T10:00:00');

  it('bloquea con multas pendientes', () => {
    expect(() => assertCanBorrow({ role: 'STUDENT', activeLoans: [], pendingPenaltiesTotal: 10 }, policy, now)).toThrow(
      'multas pendientes',
    );
  });

  it('bloquea con préstamos vencidos', () => {
    const old = openLoan(at('2026-10-01T10:00:00'));
    expect(() => assertCanBorrow({ role: 'STUDENT', activeLoans: [old], pendingPenaltiesTotal: 0 }, policy, now)).toThrow(
      'vencido',
    );
  });

  it('respeta el máximo de préstamos simultáneos', () => {
    const loans = [openLoan(now), openLoan(now), openLoan(now)];
    expect(() => assertCanBorrow({ role: 'STUDENT', activeLoans: loans, pendingPenaltiesTotal: 0 }, policy, now)).toThrow(
      'máximo de 3',
    );
    expect(() => assertCanBorrow({ role: 'LIBRARIAN', activeLoans: loans, pendingPenaltiesTotal: 0 }, policy, now)).not.toThrow();
  });
});
