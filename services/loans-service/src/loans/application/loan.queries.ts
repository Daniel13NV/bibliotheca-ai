import { Inject, Injectable } from '@nestjs/common';
import { AuthUser } from '../../shared/auth';
import { DomainError } from '../../shared/domain-error';
import { EVENT_PUBLISHER, EventPublisher } from '../../shared/event-publisher.port';
import { isStaff, Role } from '../../shared/roles';
import { LoanPolicy } from '../domain/loan-policy';
import { PenaltyStatus } from '../domain/penalty';
import { LOAN_POLICY, LOAN_REPOSITORY, LoanRepository, PENALTY_REPOSITORY, PenaltyRepository } from '../domain/ports';

@Injectable()
export class LoanQueries {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
    @Inject(PENALTY_REPOSITORY) private readonly penalties: PenaltyRepository,
    @Inject(LOAN_POLICY) private readonly policy: LoanPolicy,
  ) {}

  async myLoans(userId: string, includeReturned: boolean, role: Role = 'STUDENT') {
    const now = new Date();
    const [loans, pendingTotal] = await Promise.all([
      this.loans.findByUser(userId, includeReturned),
      this.penalties.pendingTotalByUser(userId),
    ]);
    const views = loans.map((l) => l.view(now, this.policy));
    const active = views.filter((v) => v.status !== 'RETURNED');
    return {
      summary: {
        active: active.length,
        overdue: active.filter((v) => v.status === 'OVERDUE').length,
        dueSoon: active.filter((v) => v.status === 'DUE_SOON').length,
        pendingPenalties: pendingTotal,
        maxActiveLoans: this.policy.maxActiveLoans[role],
        currency: this.policy.currency,
      },
      loans: views,
    };
  }

  async list(filter: { status?: 'ACTIVE' | 'OVERDUE' | 'RETURNED'; userId?: string }) {
    const now = new Date();
    const loans = await this.loans.list({
      status: filter.status === 'RETURNED' ? 'RETURNED' : filter.status ? 'ACTIVE' : undefined,
      userId: filter.userId,
      limit: 300,
    });
    const views = loans.map((l) => l.view(now, this.policy));
    return filter.status === 'OVERDUE' ? views.filter((v) => v.status === 'OVERDUE') : views;
  }

  async get(loanId: string, actor: AuthUser) {
    const loan = await this.loans.findById(loanId);
    if (!loan) throw DomainError.notFound('Préstamo');
    if (loan.userId !== actor.id && !isStaff(actor.role)) throw DomainError.forbidden();
    return loan.view(new Date(), this.policy);
  }

  async myPenalties(userId: string) {
    const list = await this.penalties.findByUser(userId);
    const pending = list.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0);
    return { pendingTotal: pending, currency: this.policy.currency, penalties: list.map((p) => p.view()) };
  }

  async penaltiesList(status?: PenaltyStatus) {
    return (await this.penalties.list(status)).map((p) => p.view());
  }

  policyView() {
    return this.policy;
  }

  async stats() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const [active, pending, returnedToday, loanedToday] = await Promise.all([
      this.loans.findActive(),
      this.penalties.list('PENDING'),
      this.loans.countReturnedSince(startOfDay),
      this.loans.countLoanedSince(startOfDay),
    ]);
    const overdue = active.filter((l) => l.isOverdue(now));
    return {
      activeLoans: active.length,
      overdueLoans: overdue.length,
      dueSoon: active.filter((l) => l.displayStatus(now) === 'DUE_SOON').length,
      loanedToday,
      returnedToday,
      pendingPenalties: { count: pending.length, total: pending.reduce((s, p) => s + p.amount, 0) },
      currency: this.policy.currency,
    };
  }
}

@Injectable()
export class PenaltyCommands {
  constructor(
    @Inject(PENALTY_REPOSITORY) private readonly penalties: PenaltyRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async pay(penaltyId: string, actor: AuthUser) {
    const penalty = await this.penalties.findById(penaltyId);
    if (!penalty) throw DomainError.notFound('Multa');
    penalty.pay(actor.name || actor.email, new Date());
    await this.penalties.save(penalty);
    await this.events.publish('penalty.paid', { penaltyId, userId: penalty.userId, amount: penalty.amount });
    return penalty.view();
  }

  async waive(penaltyId: string, actor: AuthUser, reason: string) {
    const penalty = await this.penalties.findById(penaltyId);
    if (!penalty) throw DomainError.notFound('Multa');
    penalty.waive(actor.name || actor.email, reason, new Date());
    await this.penalties.save(penalty);
    await this.events.publish('penalty.waived', { penaltyId, userId: penalty.userId, amount: penalty.amount, reason });
    return penalty.view();
  }
}

/** Disparado por n8n (flujo de recordatorios diarios): publica loan.due_soon y loan.overdue. */
@Injectable()
export class RemindersJob {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    @Inject(LOAN_POLICY) private readonly policy: LoanPolicy,
  ) {}

  async run(daysAhead = 2) {
    const now = new Date();
    let dueSoon = 0;
    let overdue = 0;
    for (const loan of await this.loans.findActive()) {
      const p = loan.snapshot();
      if (loan.isOverdue(now)) {
        const fine = loan.accruedFine(now, this.policy);
        await this.events.publish('loan.overdue', {
          loanId: p.id,
          userId: p.userId,
          bookTitle: p.bookTitle,
          dueDate: p.dueDate.toISOString(),
          daysLate: fine.daysLate,
          accruedFine: fine.amount,
          currency: this.policy.currency,
        });
        overdue++;
      } else if (loan.daysUntilDue(now) <= daysAhead) {
        await this.events.publish('loan.due_soon', {
          loanId: p.id,
          userId: p.userId,
          bookTitle: p.bookTitle,
          dueDate: p.dueDate.toISOString(),
          daysLeft: loan.daysUntilDue(now),
          canRenew: p.renewals < this.policy.maxRenewals,
        });
        dueSoon++;
      }
    }
    return { executedAt: now.toISOString(), daysAhead, dueSoon, overdue };
  }
}
