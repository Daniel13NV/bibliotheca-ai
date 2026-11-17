import { DomainError } from '../../shared/domain-error';

export const READER_TYPES = ['GATE', 'SHELF', 'DESK', 'RETURN_BOX'] as const;
export type ReaderType = (typeof READER_TYPES)[number];

/** Si no hay latido en este tiempo, el lector se considera fuera de línea. */
export const HEARTBEAT_TIMEOUT_MS = 90_000;

export interface ReaderProps {
  id: string; // identificador legible: GATE-01, SHELF-A…
  name: string;
  type: ReaderType;
  zone: string;
  location: string;
  active: boolean;
  lastHeartbeatAt: Date | null;
  lastReadAt: Date | null;
  createdAt: Date;
}

/** Lector RFID físico (arco de seguridad, estante inteligente, mostrador o buzón). */
export class Reader {
  private constructor(private props: ReaderProps) {}

  static register(input: { id: string; name: string; type: ReaderType; zone: string; location: string }, now: Date): Reader {
    const id = input.id.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,40}$/.test(id)) throw DomainError.validation('Id de lector inválido (ej. SHELF-A1)');
    return new Reader({
      ...input,
      id,
      active: true,
      lastHeartbeatAt: null,
      lastReadAt: null,
      createdAt: now,
    });
  }

  static restore(props: ReaderProps): Reader {
    return new Reader({ ...props });
  }

  get id() { return this.props.id; }
  get type() { return this.props.type; }
  get zone() { return this.props.zone; }
  get active() { return this.props.active; }

  heartbeat(now: Date): void {
    this.props.lastHeartbeatAt = now;
  }

  registerActivity(at: Date): void {
    this.props.lastReadAt = at;
    this.props.lastHeartbeatAt = at;
  }

  isOnline(now: Date): boolean {
    const last = this.props.lastHeartbeatAt;
    return Boolean(last && now.getTime() - last.getTime() <= HEARTBEAT_TIMEOUT_MS);
  }

  update(changes: Partial<Pick<ReaderProps, 'name' | 'zone' | 'location' | 'active' | 'type'>>): void {
    this.props = { ...this.props, ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)) };
  }

  view(now: Date) {
    const p = this.props;
    return {
      ...p,
      online: this.isOnline(now),
      lastHeartbeatAt: p.lastHeartbeatAt?.toISOString() ?? null,
      lastReadAt: p.lastReadAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    };
  }

  snapshot(): ReaderProps {
    return { ...this.props };
  }
}
