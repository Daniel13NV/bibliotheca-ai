import { Book } from '../domain/book';
import { Copy } from '../domain/copy';
import { SecurityAlert } from '../domain/security-alert';

export interface Availability {
  total: number;
  available: number;
  onLoan: number;
}

export function availabilityOf(copies: Copy[]): Availability {
  return {
    total: copies.filter((c) => c.status !== 'LOST').length,
    available: copies.filter((c) => c.status === 'AVAILABLE').length,
    onLoan: copies.filter((c) => c.status === 'ON_LOAN').length,
  };
}

export function bookView(book: Book, copies: Copy[]) {
  const p = book.snapshot();
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    availability: availabilityOf(copies),
  };
}

export function copyView(copy: Copy) {
  const p = copy.snapshot();
  return {
    ...p,
    location: `${p.zone} · Estante ${p.shelf}`,
    misplaced: copy.isMisplaced(),
    lastSeenAt: p.lastSeenAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

export function alertView(alert: SecurityAlert) {
  const p = alert.snapshot();
  return { ...p, detectedAt: p.detectedAt.toISOString(), resolvedAt: p.resolvedAt?.toISOString() ?? null };
}

export type BookView = ReturnType<typeof bookView>;
export type CopyView = ReturnType<typeof copyView>;
