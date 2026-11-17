import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthUser } from '../../shared/auth';
import { DomainError } from '../../shared/domain-error';
import { EVENT_PUBLISHER, EventPublisher } from '../../shared/event-publisher.port';
import { isStaff } from '../../shared/roles';
import { assertCanBorrow } from '../domain/borrowing-eligibility';
import { Loan, ReturnChannel } from '../domain/loan';
import { LoanPolicy } from '../domain/loan-policy';
import { Penalty } from '../domain/penalty';
import {
  Borrower,
  CATALOG_GATEWAY,
  CatalogGateway,
  LOAN_POLICY,
  LOAN_REPOSITORY,
  LoanRepository,
  PENALTY_REPOSITORY,
  PenaltyRepository,
  USER_DIRECTORY,
  UserDirectory,
} from '../domain/ports';

/** Préstamo: el estudiante escanea el ejemplar (autopréstamo) o el bibliotecario presta a una matrícula. */
@Injectable()
export class CheckoutUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
    @Inject(PENALTY_REPOSITORY) private readonly penalties: PenaltyRepository,
    @Inject(CATALOG_GATEWAY) private readonly catalog: CatalogGateway,
    @Inject(USER_DIRECTORY) private readonly directory: UserDirectory,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    @Inject(LOAN_POLICY) private readonly policy: LoanPolicy,
  ) {}

  async execute(input: { actor: AuthUser; copyRef: string; studentId?: string }) {
    const now = new Date();
    const borrower = await this.resolveBorrower(input.actor, input.studentId);

    const copy = await this.catalog.lookupCopy(input.copyRef);
    if (!copy) throw DomainError.notFound(`Ejemplar "${input.copyRef}"`);
    if (await this.loans.findActiveByCopy(copy.copyId)) {
      throw DomainError.conflict(`El ejemplar ${copy.code} ya está prestado`);
    }
    if (copy.status !== 'AVAILABLE') {
      throw DomainError.conflict(`El ejemplar ${copy.code} no está disponible (estado: ${copy.status})`);
    }

    assertCanBorrow(
      {
        role: borrower.role,
        activeLoans: await this.loans.findByUser(borrower.id, false),
        pendingPenaltiesTotal: await this.penalties.pendingTotalByUser(borrower.id),
      },
      this.policy,
      now,
    );

    const loan = Loan.open(
      {
        id: randomUUID(),
        userId: borrower.id,
        userName: borrower.name,
        borrowerRole: borrower.role,
        copyId: copy.copyId,
        copyCode: copy.code,
        copyEpc: copy.rfidEpc,
        bookId: copy.bookId,
        bookTitle: copy.bookTitle,
        checkedOutBy: input.actor.id,
      },
      this.policy,
      now,
    );
    await this.loans.save(loan);
    await this.events.publish('loan.created', {
      loanId: loan.id,
      userId: borrower.id,
      userName: borrower.name,
      copyId: copy.copyId,
      copyCode: copy.code,
      bookId: copy.bookId,
      bookTitle: copy.bookTitle,
      dueDate: loan.dueDate.toISOString(),
    });
    return loan.view(now, this.policy);
  }

  private async resolveBorrower(actor: AuthUser, studentId?: string): Promise<Borrower> {
    if (!studentId || !isStaff(actor.role)) {
      return { id: actor.id, name: actor.name, role: actor.role, studentId: null };
    }
    const borrower = await this.directory.findByStudentId(studentId);
    if (!borrower) throw DomainError.notFound(`Usuario con matrícula ${studentId}`);
    return borrower;
  }
}

/** Devolución por mostrador, por la app (bibliotecario) o automática en el buzón RFID. */
@Injectable()
export class ReturnUseCase {
  private readonly logger = new Logger(ReturnUseCase.name);

  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
    @Inject(PENALTY_REPOSITORY) private readonly penalties: PenaltyRepository,
    @Inject(CATALOG_GATEWAY) private readonly catalog: CatalogGateway,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    @Inject(LOAN_POLICY) private readonly policy: LoanPolicy,
  ) {}

  async byCopyRef(copyRef: string, channel: ReturnChannel) {
    const copy = await this.catalog.lookupCopy(copyRef);
    if (!copy) throw DomainError.notFound(`Ejemplar "${copyRef}"`);
    const loan = await this.loans.findActiveByCopy(copy.copyId);
    if (!loan) throw DomainError.rule(`El ejemplar ${copy.code} no tiene un préstamo activo`);
    return this.close(loan, channel);
  }

  async byLoanId(loanId: string, channel: ReturnChannel) {
    const loan = await this.loans.findById(loanId);
    if (!loan) throw DomainError.notFound('Préstamo');
    return this.close(loan, channel);
  }

  /** Lectura del buzón inteligente: si la etiqueta tiene préstamo activo, se devuelve sola. */
  async byRfid(epc: string): Promise<void> {
    const loan = await this.loans.findActiveByEpc(epc);
    if (!loan) return;
    await this.close(loan, 'RFID_RETURN_BOX');
    this.logger.log(`Devolución automática por buzón RFID: ${loan.bookTitle}`);
  }

  private async close(loan: Loan, channel: ReturnChannel) {
    const now = new Date();
    const fine = loan.close(now, channel, this.policy);
    await this.loans.save(loan);

    let penalty: Penalty | null = null;
    if (fine.amount > 0) {
      const p = loan.snapshot();
      penalty = Penalty.create({
        id: randomUUID(),
        userId: p.userId,
        userName: p.userName,
        loanId: p.id,
        bookTitle: p.bookTitle,
        daysLate: fine.daysLate,
        amount: fine.amount,
        createdAt: now,
      });
      await this.penalties.save(penalty);
      await this.events.publish('penalty.created', {
        penaltyId: penalty.id,
        userId: p.userId,
        loanId: p.id,
        bookTitle: p.bookTitle,
        daysLate: fine.daysLate,
        amount: fine.amount,
        currency: this.policy.currency,
      });
    }

    const p = loan.snapshot();
    await this.events.publish('loan.returned', {
      loanId: p.id,
      userId: p.userId,
      copyId: p.copyId,
      copyCode: p.copyCode,
      bookId: p.bookId,
      bookTitle: p.bookTitle,
      returnedAt: now.toISOString(),
      channel,
      daysLate: fine.daysLate,
      penaltyAmount: fine.amount,
    });
    return { loan: loan.view(now, this.policy), penalty: penalty?.view() ?? null };
  }
}

/** Renovación en un clic (app o botón del bot de Telegram). */
@Injectable()
export class RenewUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
    @Inject(PENALTY_REPOSITORY) private readonly penalties: PenaltyRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    @Inject(LOAN_POLICY) private readonly policy: LoanPolicy,
  ) {}

  async execute(input: { actor: AuthUser; loanId: string }) {
    const now = new Date();
    const loan = await this.loans.findById(input.loanId);
    if (!loan) throw DomainError.notFound('Préstamo');
    if (loan.userId !== input.actor.id && !isStaff(input.actor.role)) {
      throw DomainError.forbidden('Solo puedes renovar tus propios préstamos');
    }
    const pending = await this.penalties.pendingTotalByUser(loan.userId);
    loan.renew(this.policy, now, pending > 0);
    await this.loans.save(loan);
    await this.events.publish('loan.renewed', {
      loanId: loan.id,
      userId: loan.userId,
      bookTitle: loan.bookTitle,
      dueDate: loan.dueDate.toISOString(),
      renewals: loan.renewals,
    });
    return loan.view(now, this.policy);
  }
}
