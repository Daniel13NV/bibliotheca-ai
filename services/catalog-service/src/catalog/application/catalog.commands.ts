import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainError } from '../../shared/domain-error';
import { EVENT_PUBLISHER, EventPublisher } from '../../shared/event-publisher.port';
import { Book, BookInput } from '../domain/book';
import { Copy, CopyStatus, normalizeEpc } from '../domain/copy';
import { BOOK_REPOSITORY, BookRepository, COPY_REPOSITORY, CopyRepository } from '../domain/ports';
import { bookView, copyView } from './views';

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Casos de uso que modifican el catálogo (personal de biblioteca). */
@Injectable()
export class CatalogCommands {
  constructor(
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(COPY_REPOSITORY) private readonly copies: CopyRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async createBook(input: BookInput & { initialCopies?: number; zone?: string; shelf?: string }) {
    const { initialCopies = 0, zone, shelf, ...data } = input;
    if (data.isbn && (await this.books.findByIsbn(data.isbn.replace(/[-\s]/g, '').toUpperCase()))) {
      throw DomainError.conflict('Ya existe un libro con ese ISBN');
    }
    const book = Book.create(randomUUID(), data, new Date());
    await this.books.save(book);

    const copies: Copy[] = [];
    for (let i = 0; i < Math.min(initialCopies, 20); i++) {
      copies.push(await this.createCopy(book.id, zone ?? book.category, shelf ?? 'S/N'));
    }
    await this.publishBook('catalog.book.created', book, copies);
    return { ...bookView(book, copies), copies: copies.map(copyView) };
  }

  async updateBook(bookId: string, changes: Partial<BookInput>) {
    const book = await this.books.findById(bookId);
    if (!book) throw DomainError.notFound('Libro');
    book.update(withoutUndefined(changes), new Date());
    await this.books.save(book);
    const copies = await this.copies.findByBook(bookId);
    await this.publishBook('catalog.book.updated', book, copies);
    return bookView(book, copies);
  }

  async addCopy(bookId: string, input: { zone: string; shelf: string; rfidEpc?: string }) {
    const book = await this.books.findById(bookId);
    if (!book) throw DomainError.notFound('Libro');
    if (input.rfidEpc) await this.assertTagFree(normalizeEpc(input.rfidEpc));
    const copy = await this.createCopy(bookId, input.zone, input.shelf, input.rfidEpc);
    await this.events.publish('catalog.copy.created', {
      copyId: copy.id,
      bookId,
      code: copy.code,
      rfidEpc: copy.rfidEpc,
    });
    return copyView(copy);
  }

  async assignTag(copyId: string, epc: string) {
    const copy = await this.copies.findById(copyId);
    if (!copy) throw DomainError.notFound('Ejemplar');
    const normalized = normalizeEpc(epc);
    await this.assertTagFree(normalized, copyId);
    copy.assignTag(normalized);
    await this.copies.save(copy);
    await this.events.publish('catalog.copy.tagged', { copyId, bookId: copy.bookId, rfidEpc: normalized });
    return copyView(copy);
  }

  async changeStatus(copyId: string, status: CopyStatus) {
    const copy = await this.copies.findById(copyId);
    if (!copy) throw DomainError.notFound('Ejemplar');
    copy.changeStatus(status);
    await this.copies.save(copy);
    return copyView(copy);
  }

  async relocate(copyId: string, zone: string, shelf: string) {
    const copy = await this.copies.findById(copyId);
    if (!copy) throw DomainError.notFound('Ejemplar');
    copy.relocate(zone, shelf);
    await this.copies.save(copy);
    return copyView(copy);
  }

  private async createCopy(bookId: string, zone: string, shelf: string, rfidEpc?: string): Promise<Copy> {
    const copy = Copy.create(
      { id: randomUUID(), bookId, code: await this.copies.nextCode(), zone, shelf, rfidEpc },
      new Date(),
    );
    await this.copies.save(copy);
    return copy;
  }

  private async assertTagFree(epc: string, exceptCopyId?: string) {
    const owner = await this.copies.findByEpc(epc);
    if (owner && owner.id !== exceptCopyId) {
      throw DomainError.conflict(`La etiqueta ${epc} ya está asignada al ejemplar ${owner.code}`);
    }
  }

  private async publishBook(type: string, book: Book, copies: Copy[]) {
    await this.events.publish(type, { ...bookView(book, copies), semanticText: book.semanticText() });
  }
}
