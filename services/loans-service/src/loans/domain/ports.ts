import { Role } from '../../shared/roles';
import { Loan } from './loan';
import { Penalty, PenaltyStatus } from './penalty';

export const LOAN_REPOSITORY = Symbol('LOAN_REPOSITORY');
export interface LoanRepository {
  findById(id: string): Promise<Loan | null>;
  findActiveByCopy(copyId: string): Promise<Loan | null>;
  findActiveByEpc(epc: string): Promise<Loan | null>;
  findByUser(userId: string, includeReturned: boolean): Promise<Loan[]>;
  findActive(): Promise<Loan[]>;
  list(filter: { status?: 'ACTIVE' | 'RETURNED'; userId?: string; limit?: number }): Promise<Loan[]>;
  countReturnedSince(date: Date): Promise<number>;
  countLoanedSince(date: Date): Promise<number>;
  save(loan: Loan): Promise<void>;
  count(): Promise<number>;
}

export const PENALTY_REPOSITORY = Symbol('PENALTY_REPOSITORY');
export interface PenaltyRepository {
  findById(id: string): Promise<Penalty | null>;
  findByUser(userId: string): Promise<Penalty[]>;
  pendingTotalByUser(userId: string): Promise<number>;
  list(status?: PenaltyStatus): Promise<Penalty[]>;
  save(penalty: Penalty): Promise<void>;
}

/** Puerto hacia el contexto de catálogo (llamada síncrona HTTP). */
export const CATALOG_GATEWAY = Symbol('CATALOG_GATEWAY');
export interface CopyInfo {
  copyId: string;
  code: string;
  rfidEpc: string | null;
  status: string;
  location: string;
  bookId: string;
  bookTitle: string;
}
export interface CatalogGateway {
  lookupCopy(ref: string): Promise<CopyInfo | null>;
}

/** Puerto hacia el contexto de identidad. */
export const USER_DIRECTORY = Symbol('USER_DIRECTORY');
export interface Borrower {
  id: string;
  name: string;
  role: Role;
  studentId: string | null;
}
export interface UserDirectory {
  findByStudentId(studentId: string): Promise<Borrower | null>;
}

export const LOAN_POLICY = Symbol('LOAN_POLICY');
