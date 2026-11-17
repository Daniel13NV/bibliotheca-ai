import { ReadDeduplicator } from './read-deduplicator';
import { Reader } from './reader';
import { TagRead } from './tag-read';

describe('ReadDeduplicator', () => {
  it('acepta una lectura por lector y etiqueta dentro de la ventana', () => {
    const dedup = new ReadDeduplicator(5000);
    const t0 = new Date('2026-11-01T10:00:00Z');
    expect(dedup.shouldAccept('GATE-01', 'E0040150000000C9', t0)).toBe(true);
    expect(dedup.shouldAccept('GATE-01', 'E0040150000000C9', new Date(t0.getTime() + 1000))).toBe(false);
    expect(dedup.shouldAccept('SHELF-A', 'E0040150000000C9', new Date(t0.getTime() + 1000))).toBe(true);
    expect(dedup.shouldAccept('GATE-01', 'E0040150000000C9', new Date(t0.getTime() + 6000))).toBe(true);
  });
});

describe('Reader', () => {
  it('se considera en línea solo con latidos recientes', () => {
    const now = new Date('2026-11-01T10:00:00Z');
    const reader = Reader.register({ id: 'gate-01', name: 'Arco', type: 'GATE', zone: 'Acceso', location: 'Entrada' }, now);
    expect(reader.id).toBe('GATE-01');
    expect(reader.isOnline(now)).toBe(false);
    reader.heartbeat(now);
    expect(reader.isOnline(new Date(now.getTime() + 30_000))).toBe(true);
    expect(reader.isOnline(new Date(now.getTime() + 120_000))).toBe(false);
  });
});

describe('TagRead', () => {
  it('normaliza la etiqueta y corrige lecturas del futuro', () => {
    const now = new Date('2026-11-01T10:00:00Z');
    const read = TagRead.capture({ id: '1', readerId: 'GATE-01', epc: 'e0:04:01:50:00:00:00:c9', readAt: new Date('2030-01-01') }, now);
    expect(read.epc).toBe('E0040150000000C9');
    expect(read.readAt).toEqual(now);
  });
});
