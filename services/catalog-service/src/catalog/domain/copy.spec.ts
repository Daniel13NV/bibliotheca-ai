import { Copy, normalizeEpc } from './copy';

describe('Copy (ejemplar)', () => {
  const now = new Date('2026-11-01T10:00:00Z');
  const copy = () => Copy.create({ id: 'c1', bookId: 'b1', code: 'BIB-0001', zone: 'Ciencias', shelf: 'a1' }, now);

  it('nace disponible y normaliza el estante', () => {
    const c = copy();
    expect(c.isAvailable()).toBe(true);
    expect(c.snapshot().shelf).toBe('A1');
  });

  it('normaliza identificadores RFID', () => {
    expect(normalizeEpc('e0:04:01:50:00:00:00:01')).toBe('E004015000000001');
    expect(() => normalizeEpc('xyz')).toThrow();
  });

  it('dispara alerta si un ejemplar no prestado cruza el arco', () => {
    const c = copy();
    expect(c.isUnauthorizedExit('GATE')).toBe(true);
    c.markOnLoan();
    expect(c.isUnauthorizedExit('GATE')).toBe(false);
    expect(c.isUnauthorizedExit('SHELF')).toBe(false);
  });

  it('detecta libros mal ubicados', () => {
    const c = copy();
    c.registerSighting('SHELF-B1', 'Literatura', now);
    expect(c.isMisplaced()).toBe(true);
  });

  it('no permite marcar préstamos manualmente', () => {
    expect(() => copy().changeStatus('ON_LOAN')).toThrow();
  });
});
