import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Book } from '../../domain/book';
import { Copy } from '../../domain/copy';
import { BOOK_REPOSITORY, BookRepository, COPY_REPOSITORY, CopyRepository } from '../../domain/ports';
import { SEED_BOOKS, SEED_ON_LOAN, seedBookId, seedCopyCode, seedCopyEpc, seedCopyId, ZONES } from './books.seed';

@Injectable()
export class CatalogSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(COPY_REPOSITORY) private readonly copies: CopyRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_DATA === 'false' || (await this.books.count()) > 0) return;
    const now = new Date();
    let copiesCount = 0;

    for (const [index, seed] of SEED_BOOKS.entries()) {
      const i = index + 1;
      const { copies, ...data } = seed;
      const book = Book.create(
        seedBookId(i),
        { ...data, isbn: null, coverUrl: null, language: data.language ?? 'Español' },
        now,
      );
      await this.books.save(book);

      const location = ZONES[seed.category] ?? { zone: 'General', shelf: 'G1' };
      for (let j = 1; j <= copies; j++) {
        const copy = Copy.create(
          {
            id: seedCopyId(i, j),
            bookId: book.id,
            code: seedCopyCode(i, j),
            zone: location.zone,
            shelf: location.shelf,
            rfidEpc: seedCopyEpc(i, j),
          },
          now,
        );
        if (SEED_ON_LOAN.includes(copy.id)) copy.markOnLoan();
        await this.copies.save(copy);
        copiesCount++;
      }
    }
    this.logger.log(`Catálogo de demostración: ${SEED_BOOKS.length} libros y ${copiesCount} ejemplares con RFID`);
  }
}
