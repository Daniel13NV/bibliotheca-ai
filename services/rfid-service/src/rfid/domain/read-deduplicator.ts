/**
 * Un lector RFID reporta la misma etiqueta decenas de veces por segundo mientras está en su campo.
 * Este servicio de dominio deja pasar solo una lectura por (lector, etiqueta) dentro de una ventana.
 */
export class ReadDeduplicator {
  private readonly lastSeen = new Map<string, number>();

  constructor(private readonly windowMs: number) {}

  shouldAccept(readerId: string, epc: string, at: Date): boolean {
    const key = `${readerId}|${epc}`;
    const previous = this.lastSeen.get(key);
    const time = at.getTime();
    if (previous !== undefined && Math.abs(time - previous) < this.windowMs) return false;
    this.lastSeen.set(key, time);
    if (this.lastSeen.size > 50_000) this.prune(time);
    return true;
  }

  prune(now: number): void {
    for (const [key, time] of this.lastSeen) {
      if (now - time > this.windowMs) this.lastSeen.delete(key);
    }
  }
}
