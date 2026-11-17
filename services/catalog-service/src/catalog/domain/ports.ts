import { Book } from './book';
import { Copy, CopyStatus } from './copy';
import { SecurityAlert, AlertStatus } from './security-alert';

export const BOOK_REPOSITORY = Symbol('BOOK_REPOSITORY');
export interface BookSearch {
  text?: string;
  category?: string;
  page: number;
  pageSize: number;
}
export interface BookRepository {
  findById(id: string): Promise<Book | null>;
  findByIds(ids: string[]): Promise<Book[]>;
  findByIsbn(isbn: string): Promise<Book | null>;
  search(query: BookSearch): Promise<{ items: Book[]; total: number }>;
  categories(): Promise<Array<{ category: string; count: number }>>;
  listAll(): Promise<Book[]>;
  save(book: Book): Promise<void>;
  count(): Promise<number>;
}

export const COPY_REPOSITORY = Symbol('COPY_REPOSITORY');
export interface CopyRepository {
  findById(id: string): Promise<Copy | null>;
  findByCode(code: string): Promise<Copy | null>;
  findByEpc(epc: string): Promise<Copy | null>;
  findByBook(bookId: string): Promise<Copy[]>;
  findByBooks(bookIds: string[]): Promise<Copy[]>;
  findAll(): Promise<Copy[]>;
  nextCode(): Promise<string>;
  save(copy: Copy): Promise<void>;
}

export const ALERT_REPOSITORY = Symbol('ALERT_REPOSITORY');
export interface AlertRepository {
  findById(id: string): Promise<SecurityAlert | null>;
  list(status?: AlertStatus, limit?: number): Promise<SecurityAlert[]>;
  save(alert: SecurityAlert): Promise<void>;
}

export type { CopyStatus };
