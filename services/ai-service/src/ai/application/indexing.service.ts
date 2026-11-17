import { Inject, Injectable, Logger } from '@nestjs/common';
import { toDocument } from '../domain/model';
import { CATALOG_SOURCE, CatalogSource, KNOWLEDGE_INDEX, KnowledgeIndex } from '../domain/ports';

/** Mantiene la base vectorial sincronizada con el catálogo. */
@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);
  private lastReindex: { at: string; indexed: number } | null = null;

  constructor(
    @Inject(KNOWLEDGE_INDEX) private readonly index: KnowledgeIndex,
    @Inject(CATALOG_SOURCE) private readonly catalog: CatalogSource,
  ) {}

  /** Evento catalog.book.created / catalog.book.updated */
  async indexBook(book: Parameters<typeof toDocument>[0]): Promise<void> {
    await this.index.upsert([toDocument(book)]);
    this.logger.log(`Indexado: ${book.title}`);
  }

  async reindexAll(reset = false) {
    const books = await this.catalog.listBooks();
    if (reset) await this.index.reset();
    let indexed = 0;
    // Lotes pequeños para no saturar a Ollama en equipos modestos.
    for (let i = 0; i < books.length; i += 8) {
      indexed += await this.index.upsert(books.slice(i, i + 8).map(toDocument));
    }
    this.lastReindex = { at: new Date().toISOString(), indexed };
    this.logger.log(`Catálogo reindexado: ${indexed} libros`);
    return this.lastReindex;
  }

  /** Reindexa si la colección está vacía o desfasada respecto al catálogo. */
  async ensureIndexed(): Promise<boolean> {
    const [size, books] = await Promise.all([this.index.size(), this.catalog.listBooks()]);
    if (books.length === 0) return false;
    if (size < books.length) await this.reindexAll();
    return true;
  }

  async status() {
    return { indexedDocuments: await this.index.size().catch(() => 0), lastReindex: this.lastReindex };
  }
}
