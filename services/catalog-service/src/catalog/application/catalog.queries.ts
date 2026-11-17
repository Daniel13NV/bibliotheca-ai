import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../shared/domain-error';
import { Copy } from '../domain/copy';
import { BOOK_REPOSITORY, BookRepository, COPY_REPOSITORY, CopyRepository } from '../domain/ports';
import { availabilityOf, bookView, copyView } from './views';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Casos de uso de solo lectura del catálogo. */
@Injectable()
export class CatalogQueries {
  constructor(
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(COPY_REPOSITORY) private readonly copies: CopyRepository,
  ) {}

  async search(query: { text?: string; category?: string; availableOnly?: boolean; page?: number; pageSize?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
    const { items, total } = await this.books.search({ text: query.text, category: query.category, page, pageSize });
    const copies = await this.copies.findByBooks(items.map((b) => b.id));
    let views = items.map((book) => bookView(book, copies.filter((c) => c.bookId === book.id)));
    if (query.availableOnly) views = views.filter((v) => v.availability.available > 0);
    return { items: views, total, page, pageSize };
  }

  async detail(bookId: string) {
    const book = await this.books.findById(bookId);
    if (!book) throw DomainError.notFound('Libro');
    const copies = await this.copies.findByBook(bookId);
    return { ...bookView(book, copies), copies: copies.map(copyView) };
  }

  categories() {
    return this.books.categories();
  }

  /** Busca un ejemplar por id, código QR (BIB-0001) o identificador RFID. */
  async findCopy(ref: string): Promise<Copy | null> {
    const value = ref.trim();
    if (!value) return null;
    if (UUID_REGEX.test(value)) {
      const byId = await this.copies.findById(value);
      if (byId) return byId;
    }
    const byCode = await this.copies.findByCode(value.toUpperCase());
    if (byCode) return byCode;
    const compact = value.replace(/[\s:-]/g, '').toUpperCase();
    return /^[0-9A-F]{8,32}$/.test(compact) ? this.copies.findByEpc(compact) : null;
  }

  async lookupCopy(ref: string) {
    const copy = await this.findCopy(ref);
    if (!copy) throw DomainError.notFound(`Ejemplar "${ref}"`);
    const book = await this.books.findById(copy.bookId);
    if (!book) throw DomainError.notFound('Libro del ejemplar');
    const p = book.snapshot();
    return {
      copy: copyView(copy),
      book: { id: p.id, title: p.title, authors: p.authors, category: p.category, coverUrl: p.coverUrl },
    };
  }

  /** Disponibilidad y ubicación de varios libros (lo usa el asistente de IA para sus respuestas). */
  async availability(bookIds: string[]) {
    const copies = await this.copies.findByBooks(bookIds);
    return Object.fromEntries(
      bookIds.map((id) => {
        const own = copies.filter((c) => c.bookId === id);
        const locations = [...new Set(own.filter((c) => c.isAvailable()).map((c) => copyView(c).location))];
        return [id, { ...availabilityOf(own), locations }];
      }),
    );
  }

  /** Exporta todos los libros (lo usa el servicio de IA para reindexar). */
  async exportAll() {
    const [books, copies] = await Promise.all([this.books.listAll(), this.copies.findAll()]);
    return books.map((b) => ({
      ...bookView(b, copies.filter((c) => c.bookId === b.id)),
      semanticText: b.semanticText(),
    }));
  }

  async exportOne(bookId: string) {
    const book = await this.books.findById(bookId);
    if (!book) throw DomainError.notFound('Libro');
    const copies = await this.copies.findByBook(bookId);
    return { ...bookView(book, copies), semanticText: book.semanticText() };
  }

  /** Resumen para el inventario automático con RFID. */
  async inventory(staleHours = 24) {
    const copies = await this.copies.findAll();
    const threshold = Date.now() - staleHours * 3_600_000;
    const byStatus: Record<string, number> = {};
    copies.forEach((c) => (byStatus[c.status] = (byStatus[c.status] ?? 0) + 1));
    const misplaced = copies.filter((c) => c.isMisplaced());
    const notSeen = copies.filter((c) => {
      const seen = c.snapshot().lastSeenAt;
      return c.status === 'AVAILABLE' && (!seen || seen.getTime() < threshold);
    });
    const untagged = copies.filter((c) => !c.rfidEpc);
    return {
      totalCopies: copies.length,
      byStatus,
      misplaced: misplaced.map(copyView),
      notSeenRecently: { hours: staleHours, count: notSeen.length, copies: notSeen.slice(0, 50).map(copyView) },
      untagged: { count: untagged.length, copies: untagged.slice(0, 50).map(copyView) },
    };
  }
}
