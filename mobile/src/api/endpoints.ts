import { request } from './client';
import type {
  AppNotification,
  AuthResponse,
  Book,
  BookDetail,
  ChatAnswer,
  ChatTurn,
  Copy,
  CopyLookup,
  Inventory,
  Loan,
  LoanStats,
  MyLoans,
  Paged,
  Penalty,
  Reader,
  RecommendedBook,
  RfidStats,
  SecurityAlert,
  SummaryLevel,
  TagRead,
  TelegramLinkCode,
  User,
} from './types';

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return entries.length ? `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')}` : '';
};

const AI_TIMEOUT = 180_000; // los modelos locales pueden tardar sin GPU

export const api = {
  health: () => request<{ status: string; services: Array<{ service: string; status: string }> }>('GET', '/health', undefined, 6000),

  auth: {
    login: (email: string, password: string) => request<AuthResponse>('POST', '/auth/login', { email, password }),
    register: (data: { name: string; email: string; password: string; studentId?: string }) =>
      request<AuthResponse>('POST', '/auth/register', data),
  },

  users: {
    me: () => request<User>('GET', '/users/me'),
    telegramLink: () => request<TelegramLinkCode>('POST', '/users/me/telegram-link'),
    telegramUnlink: () => request<User>('DELETE', '/users/me/telegram-link'),
  },

  catalog: {
    search: (p: { search?: string; category?: string; availableOnly?: boolean; page?: number; pageSize?: number }) =>
      request<Paged<Book>>('GET', `/catalog/books${qs(p)}`),
    book: (id: string) => request<BookDetail>('GET', `/catalog/books/${id}`),
    categories: () => request<Array<{ category: string; count: number }>>('GET', '/catalog/categories'),
    lookup: (ref: string) => request<CopyLookup>('GET', `/catalog/copies/lookup${qs({ ref })}`),
    createBook: (data: Record<string, unknown>) => request<BookDetail>('POST', '/catalog/books', data),
    addCopy: (bookId: string, data: { zone: string; shelf: string; rfidEpc?: string }) =>
      request<Copy>('POST', `/catalog/books/${bookId}/copies`, data),
    assignTag: (copyId: string, epc: string) => request<Copy>('PATCH', `/catalog/copies/${copyId}/rfid`, { epc }),
    inventory: () => request<Inventory>('GET', '/catalog/inventory'),
    alerts: (status?: 'OPEN' | 'RESOLVED') => request<SecurityAlert[]>('GET', `/catalog/alerts${qs({ status })}`),
    resolveAlert: (id: string, notes?: string) => request<SecurityAlert>('POST', `/catalog/alerts/${id}/resolve`, { notes }),
  },

  loans: {
    mine: (history = false) => request<MyLoans>('GET', `/loans/me${qs({ history })}`),
    checkout: (copyRef: string, studentId?: string) => request<Loan>('POST', '/loans/checkout', { copyRef, studentId }),
    giveBack: (copyRef: string) => request<{ loan: Loan; penalty: Penalty | null }>('POST', '/loans/return', { copyRef }),
    giveBackById: (id: string) => request<{ loan: Loan; penalty: Penalty | null }>('POST', `/loans/${id}/return`),
    renew: (id: string) => request<Loan>('POST', `/loans/${id}/renew`),
    list: (status?: 'ACTIVE' | 'OVERDUE' | 'RETURNED') => request<Loan[]>('GET', `/loans${qs({ status })}`),
    stats: () => request<LoanStats>('GET', '/loans/stats'),
    reminders: () => request<{ dueSoon: number; overdue: number }>('POST', '/loans/jobs/reminders', { daysAhead: 2 }),
  },

  penalties: {
    mine: () => request<{ pendingTotal: number; currency: string; penalties: Penalty[] }>('GET', '/penalties/me'),
    list: (status?: 'PENDING' | 'PAID' | 'WAIVED') => request<Penalty[]>('GET', `/penalties${qs({ status })}`),
    pay: (id: string) => request<Penalty>('POST', `/penalties/${id}/pay`),
  },

  rfid: {
    readers: () => request<Reader[]>('GET', '/rfid/readers'),
    reads: (limit = 30) => request<TagRead[]>('GET', `/rfid/reads${qs({ limit })}`),
    stats: () => request<RfidStats>('GET', '/rfid/stats'),
    simulate: (readerId: string, epc: string) =>
      request<{ accepted: number; duplicates: number }>('POST', '/rfid/simulate', { readerId, epc }),
  },

  notifications: {
    mine: () => request<{ unread: number; items: AppNotification[] }>('GET', '/notifications/me'),
    readAll: () => request<{ ok: boolean }>('POST', '/notifications/me/read-all'),
    test: () => request<AppNotification>('POST', '/notifications/me/test'),
  },

  ai: {
    search: (query: string) =>
      request<{ query: string; results: RecommendedBook[] }>('POST', '/ai/search', { query, limit: 8 }, AI_TIMEOUT),
    chat: (question: string, history: ChatTurn[]) =>
      request<ChatAnswer>('POST', '/ai/chat', { question, history }, AI_TIMEOUT),
    summary: (bookId: string, level: SummaryLevel) =>
      request<{ summary: string; cached: boolean }>('POST', `/ai/books/${bookId}/summary`, { level }, AI_TIMEOUT),
    ask: (bookId: string, question: string, history: ChatTurn[]) =>
      request<{ answer: string }>('POST', `/ai/books/${bookId}/ask`, { question, history }, AI_TIMEOUT),
  },
};
