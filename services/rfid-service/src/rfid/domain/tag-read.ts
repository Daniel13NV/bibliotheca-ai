import { DomainError } from '../../shared/domain-error';

export interface TagReadProps {
  id: string;
  readerId: string;
  epc: string;
  rssi: number | null;
  antenna: number | null;
  readAt: Date;
}

export function normalizeEpc(epc: string): string {
  const value = String(epc).replace(/[\s:-]/g, '').toUpperCase();
  if (!/^[0-9A-F]{8,32}$/.test(value)) throw DomainError.validation(`Etiqueta inválida: ${epc}`);
  return value;
}

/** Lectura cruda de una etiqueta (evento de telemetría). */
export class TagRead {
  private constructor(private readonly props: TagReadProps) {}

  static capture(input: { id: string; readerId: string; epc: string; rssi?: number | null; antenna?: number | null; readAt?: Date }, now: Date): TagRead {
    const readAt = input.readAt && !Number.isNaN(input.readAt.getTime()) ? input.readAt : now;
    // Relojes de lectores desfasados: nunca aceptamos lecturas "del futuro".
    return new TagRead({
      id: input.id,
      readerId: input.readerId,
      epc: normalizeEpc(input.epc),
      rssi: typeof input.rssi === 'number' ? Math.round(input.rssi) : null,
      antenna: typeof input.antenna === 'number' ? Math.round(input.antenna) : null,
      readAt: readAt.getTime() > now.getTime() + 60_000 ? now : readAt,
    });
  }

  static restore(props: TagReadProps): TagRead {
    return new TagRead({ ...props });
  }

  get epc() { return this.props.epc; }
  get readerId() { return this.props.readerId; }
  get readAt() { return this.props.readAt; }

  view() {
    return { ...this.props, readAt: this.props.readAt.toISOString() };
  }

  snapshot(): TagReadProps {
    return { ...this.props };
  }
}
