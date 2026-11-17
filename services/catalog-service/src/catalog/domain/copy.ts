import { DomainError } from '../../shared/domain-error';

export const COPY_STATUSES = ['AVAILABLE', 'ON_LOAN', 'RESERVED', 'MAINTENANCE', 'LOST'] as const;
export type CopyStatus = (typeof COPY_STATUSES)[number];

export const READER_TYPES = ['GATE', 'SHELF', 'DESK', 'RETURN_BOX'] as const;
export type ReaderType = (typeof READER_TYPES)[number];

export interface CopyProps {
  id: string;
  bookId: string;
  code: string; // código de inventario impreso como QR (BIB-0001)
  rfidEpc: string | null; // UID/EPC de la etiqueta RFID pegada al libro
  status: CopyStatus;
  zone: string; // zona asignada (p. ej. "Ciencias")
  shelf: string; // estante asignado (p. ej. "A1")
  lastSeenAt: Date | null;
  lastSeenReaderId: string | null;
  lastSeenZone: string | null;
  createdAt: Date;
}

export function normalizeEpc(epc: string): string {
  const value = epc.replace(/[\s:-]/g, '').toUpperCase();
  if (!/^[0-9A-F]{8,32}$/.test(value)) {
    throw DomainError.validation('El identificador RFID debe ser hexadecimal (8 a 32 caracteres)');
  }
  return value;
}

/** Ejemplar físico (activo) rastreado por RFID. */
export class Copy {
  private constructor(private props: CopyProps) {}

  static create(input: { id: string; bookId: string; code: string; zone: string; shelf: string; rfidEpc?: string | null }, now: Date): Copy {
    if (!input.zone?.trim() || !input.shelf?.trim()) throw DomainError.validation('Zona y estante son obligatorios');
    return new Copy({
      id: input.id,
      bookId: input.bookId,
      code: input.code,
      rfidEpc: input.rfidEpc ? normalizeEpc(input.rfidEpc) : null,
      status: 'AVAILABLE',
      zone: input.zone.trim(),
      shelf: input.shelf.trim().toUpperCase(),
      lastSeenAt: null,
      lastSeenReaderId: null,
      lastSeenZone: null,
      createdAt: now,
    });
  }

  static restore(props: CopyProps): Copy {
    return new Copy({ ...props });
  }

  get id() { return this.props.id; }
  get bookId() { return this.props.bookId; }
  get code() { return this.props.code; }
  get rfidEpc() { return this.props.rfidEpc; }
  get status() { return this.props.status; }
  get zone() { return this.props.zone; }

  isAvailable(): boolean {
    return this.props.status === 'AVAILABLE';
  }

  assignTag(epc: string): void {
    this.props.rfidEpc = normalizeEpc(epc);
  }

  /** Sincronización por evento loan.created (idempotente). */
  markOnLoan(): void {
    this.props.status = 'ON_LOAN';
  }

  /** Sincronización por evento loan.returned (idempotente). */
  markReturned(): void {
    this.props.status = 'AVAILABLE';
  }

  changeStatus(status: CopyStatus): void {
    if (status === 'ON_LOAN' || this.props.status === 'ON_LOAN') {
      throw DomainError.rule('Los préstamos y devoluciones se registran en el servicio de préstamos');
    }
    this.props.status = status;
  }

  relocate(zone: string, shelf: string): void {
    this.props.zone = zone.trim();
    this.props.shelf = shelf.trim().toUpperCase();
  }

  registerSighting(readerId: string, zone: string | null, at: Date): void {
    this.props.lastSeenAt = at;
    this.props.lastSeenReaderId = readerId;
    this.props.lastSeenZone = zone;
  }

  /**
   * Regla del arco de seguridad: solo puede salir de la biblioteca un ejemplar prestado.
   */
  isUnauthorizedExit(readerType: ReaderType): boolean {
    return readerType === 'GATE' && this.props.status !== 'ON_LOAN';
  }

  /** Detectado por un estante distinto al que le corresponde. */
  isMisplaced(): boolean {
    return Boolean(this.props.lastSeenZone && this.props.lastSeenZone !== this.props.zone && this.props.status === 'AVAILABLE');
  }

  snapshot(): CopyProps {
    return { ...this.props };
  }
}
