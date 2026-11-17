import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Loan } from '../../domain/loan';
import { addDays, LoanPolicy } from '../../domain/loan-policy';
import { LOAN_POLICY, LOAN_REPOSITORY, LoanRepository } from '../../domain/ports';

/**
 * Préstamos de demostración (coinciden con los ejemplares marcados ON_LOAN en catalog-service):
 *  - Daniel: "Siete breves lecciones de física", vence mañana → recordatorio + renovación.
 *  - Ana: "Cien años de soledad", vencido hace 4 días → multa acumulada.
 */
@Injectable()
export class LoansSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
    @Inject(LOAN_POLICY) private readonly policy: LoanPolicy,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_DATA === 'false' || (await this.loans.count()) > 0) return;
    const now = new Date();
    const studentDays = this.policy.loanDays.STUDENT;

    const daniel = Loan.open(
      {
        id: 'd0000000-0000-4000-8000-000000000001',
        userId: '33333333-3333-4333-8333-333333333331',
        userName: 'Daniel Pérez',
        borrowerRole: 'STUDENT',
        copyId: 'c0000000-0000-4000-8000-000000000301',
        copyCode: 'BIB-00301',
        copyEpc: 'E00401500000012D',
        bookId: 'b0000000-0000-4000-8000-000000000003',
        bookTitle: 'Siete breves lecciones de física',
        checkedOutBy: '22222222-2222-4222-8222-222222222222',
      },
      this.policy,
      addDays(now, -(studentDays - 1)),
    );

    const ana = Loan.open(
      {
        id: 'd0000000-0000-4000-8000-000000000002',
        userId: '33333333-3333-4333-8333-333333333332',
        userName: 'Ana Gómez',
        borrowerRole: 'STUDENT',
        copyId: 'c0000000-0000-4000-8000-000000001301',
        copyCode: 'BIB-01301',
        copyEpc: 'E004015000000515',
        bookId: 'b0000000-0000-4000-8000-000000000013',
        bookTitle: 'Cien años de soledad',
        checkedOutBy: '22222222-2222-4222-8222-222222222222',
      },
      this.policy,
      addDays(now, -(studentDays + 4)),
    );

    await this.loans.save(daniel);
    await this.loans.save(ana);
    this.logger.log('Préstamos de demostración creados (uno por vencer y uno vencido)');
  }
}
