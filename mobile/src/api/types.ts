export type Role = 'STUDENT' | 'LIBRARIAN' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId: string | null;
  telegramLinked: boolean;
  telegramUsername: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: User;
}

export interface Availability {
  total: number;
  available: number;
  onLoan: number;
  locations?: string[];
}

export type CopyStatus = 'AVAILABLE' | 'ON_LOAN' | 'RESERVED' | 'MAINTENANCE' | 'LOST';

export interface Copy {
  id: string;
  bookId: string;
  code: string;
  rfidEpc: string | null;
  status: CopyStatus;
  zone: string;
  shelf: string;
  location: string;
  misplaced: boolean;
  lastSeenAt: string | null;
  lastSeenReaderId: string | null;
  lastSeenZone: string | null;
}

export interface Book {
  id: string;
  isbn: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  year: number | null;
  category: string;
  language: string;
  synopsis: string;
  coverUrl: string | null;
  pages: number | null;
  tags: string[];
  availability: Availability;
}

export interface BookDetail extends Book {
  copies: Copy[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CopyLookup {
  copy: Copy;
  book: { id: string; title: string; authors: string[]; category: string; coverUrl: string | null };
}

export type LoanStatus = 'ACTIVE' | 'DUE_SOON' | 'OVERDUE' | 'RETURNED';

export interface Loan {
  id: string;
  userId: string;
  userName: string;
  copyId: string;
  copyCode: string;
  bookId: string;
  bookTitle: string;
  loanedAt: string;
  dueDate: string;
  returnedAt: string | null;
  returnChannel: 'DESK' | 'APP' | 'RFID_RETURN_BOX' | null;
  renewals: number;
  renewalsLeft: number;
  status: LoanStatus;
  daysUntilDue: number | null;
  accruedFine: number;
}

export interface MyLoans {
  summary: {
    active: number;
    overdue: number;
    dueSoon: number;
    pendingPenalties: number;
    maxActiveLoans: number;
    currency: string;
  };
  loans: Loan[];
}

export interface Penalty {
  id: string;
  userId: string;
  userName: string;
  loanId: string;
  bookTitle: string;
  daysLate: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'WAIVED';
  createdAt: string;
  settledAt: string | null;
}

export interface LoanStats {
  activeLoans: number;
  overdueLoans: number;
  dueSoon: number;
  loanedToday: number;
  returnedToday: number;
  pendingPenalties: { count: number; total: number };
  currency: string;
}

export interface Reader {
  id: string;
  name: string;
  type: 'GATE' | 'SHELF' | 'DESK' | 'RETURN_BOX';
  zone: string;
  location: string;
  active: boolean;
  online: boolean;
  lastHeartbeatAt: string | null;
  lastReadAt: string | null;
}

export interface TagRead {
  id: string;
  readerId: string;
  epc: string;
  rssi: number | null;
  antenna: number | null;
  readAt: string;
  readerType: Reader['type'] | null;
  zone: string | null;
}

export interface RfidStats {
  readers: number;
  online: number;
  readsLastHour: number;
  byReader: Array<{ readerId: string; count: number }>;
}

export interface SecurityAlert {
  id: string;
  copyId: string;
  bookTitle: string;
  copyCode: string;
  epc: string;
  readerId: string;
  zone: string | null;
  copyStatus: string;
  detectedAt: string;
  status: 'OPEN' | 'RESOLVED';
}

export interface Inventory {
  totalCopies: number;
  byStatus: Record<string, number>;
  misplaced: Copy[];
  notSeenRecently: { hours: number; count: number; copies: Copy[] };
  untagged: { count: number; copies: Copy[] };
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  channel: 'TELEGRAM' | 'IN_APP';
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  read: boolean;
  createdAt: string;
}

export interface RecommendedBook {
  bookId: string;
  title: string;
  authors: string[];
  category: string;
  score: number;
  availability: Availability | null;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatAnswer {
  answer: string;
  books: RecommendedBook[];
  llmAvailable: boolean;
}

export type SummaryLevel = 'breve' | 'detallado' | 'principiante';

export interface TelegramLinkCode {
  code: string;
  expiresAt: string;
  botUsername: string;
  deepLink: string;
  instructions: string;
}
