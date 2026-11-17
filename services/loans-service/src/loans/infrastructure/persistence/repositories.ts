import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, MoreThanOrEqual, Repository } from 'typeorm';
import { Role } from '../../../shared/roles';
import { Loan, LoanStatus, ReturnChannel } from '../../domain/loan';
import { Penalty, PenaltyStatus } from '../../domain/penalty';
import { LoanRepository, PenaltyRepository } from '../../domain/ports';
import { LoanOrmEntity, PenaltyOrmEntity } from './orm-entities';

@Injectable()
export class TypeOrmLoanRepository implements LoanRepository {
  constructor(@InjectRepository(LoanOrmEntity) private readonly repo: Repository<LoanOrmEntity>) {}

  private toDomain = (row: LoanOrmEntity): Loan =>
    Loan.restore({
      ...row,
      borrowerRole: row.borrowerRole as Role,
      status: row.status as LoanStatus,
      returnChannel: row.returnChannel as ReturnChannel | null,
    });

  private async one(where: FindOptionsWhere<LoanOrmEntity>) {
    const row = await this.repo.findOneBy(where);
    return row ? this.toDomain(row) : null;
  }

  findById(id: string) { return this.one({ id }); }
  findActiveByCopy(copyId: string) { return this.one({ copyId, status: 'ACTIVE' }); }
  findActiveByEpc(epc: string) { return this.one({ copyEpc: epc, status: 'ACTIVE' }); }

  async findByUser(userId: string, includeReturned: boolean) {
    const rows = await this.repo.find({
      where: includeReturned ? { userId } : { userId, status: 'ACTIVE' },
      order: { loanedAt: 'DESC' },
      take: 100,
    });
    return rows.map(this.toDomain);
  }

  async findActive() {
    return (await this.repo.find({ where: { status: 'ACTIVE' }, order: { dueDate: 'ASC' } })).map(this.toDomain);
  }

  async list(filter: { status?: 'ACTIVE' | 'RETURNED'; userId?: string; limit?: number }) {
    const where: FindOptionsWhere<LoanOrmEntity> = {};
    if (filter.status) where.status = filter.status;
    if (filter.userId) where.userId = filter.userId;
    const rows = await this.repo.find({
      where,
      order: filter.status === 'ACTIVE' ? { dueDate: 'ASC' } : { loanedAt: 'DESC' },
      take: filter.limit ?? 100,
    });
    return rows.map(this.toDomain);
  }

  countReturnedSince(date: Date) {
    return this.repo.countBy({ returnedAt: MoreThanOrEqual(date) });
  }

  countLoanedSince(date: Date) {
    return this.repo.countBy({ loanedAt: MoreThanOrEqual(date) });
  }

  async save(loan: Loan) {
    await this.repo.save(this.repo.create(loan.snapshot()));
  }

  count() {
    return this.repo.count();
  }
}

@Injectable()
export class TypeOrmPenaltyRepository implements PenaltyRepository {
  constructor(@InjectRepository(PenaltyOrmEntity) private readonly repo: Repository<PenaltyOrmEntity>) {}

  private toDomain = (row: PenaltyOrmEntity): Penalty =>
    Penalty.restore({ ...row, amount: Number(row.amount), status: row.status as PenaltyStatus });

  async findById(id: string) {
    const row = await this.repo.findOneBy({ id });
    return row ? this.toDomain(row) : null;
  }

  async findByUser(userId: string) {
    return (await this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } })).map(this.toDomain);
  }

  async pendingTotalByUser(userId: string) {
    const row = await this.repo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.user_id = :userId AND p.status = :status', { userId, status: 'PENDING' })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  async list(status?: PenaltyStatus) {
    const rows = await this.repo.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' }, take: 300 });
    return rows.map(this.toDomain);
  }

  async save(penalty: Penalty) {
    await this.repo.save(this.repo.create(penalty.snapshot()));
  }
}
