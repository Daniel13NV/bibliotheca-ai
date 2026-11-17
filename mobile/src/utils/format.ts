import type { CopyStatus, LoanStatus } from '../api/types';
import type { Tone } from '../theme';

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'nunca';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `hace ${Math.max(seconds, 0)} s`;
  if (seconds < 3600) return `hace ${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.round(seconds / 3600)} h`;
  return `hace ${Math.round(seconds / 86400)} d`;
}

export const money = (amount: number, currency = 'MXN') => `$${amount.toFixed(2)} ${currency}`;

export const COPY_STATUS: Record<CopyStatus, { label: string; tone: Tone }> = {
  AVAILABLE: { label: 'Disponible', tone: 'success' },
  ON_LOAN: { label: 'Prestado', tone: 'warning' },
  RESERVED: { label: 'Reservado', tone: 'info' },
  MAINTENANCE: { label: 'Mantenimiento', tone: 'neutral' },
  LOST: { label: 'Extraviado', tone: 'danger' },
};

export const LOAN_STATUS: Record<LoanStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Activo', tone: 'success' },
  DUE_SOON: { label: 'Por vencer', tone: 'warning' },
  OVERDUE: { label: 'Vencido', tone: 'danger' },
  RETURNED: { label: 'Devuelto', tone: 'neutral' },
};

export function dueText(status: LoanStatus, daysUntilDue: number | null): string {
  if (status === 'RETURNED' || daysUntilDue === null) return '';
  if (status === 'OVERDUE') return `Vencido hace ${Math.abs(daysUntilDue)} día(s)`;
  if (daysUntilDue === 0) return 'Vence hoy';
  if (daysUntilDue === 1) return 'Vence mañana';
  return `Vence en ${daysUntilDue} días`;
}

export const READER_ICON: Record<string, 'exit-outline' | 'library-outline' | 'desktop-outline' | 'mail-outline'> = {
  GATE: 'exit-outline',
  SHELF: 'library-outline',
  DESK: 'desktop-outline',
  RETURN_BOX: 'mail-outline',
};
