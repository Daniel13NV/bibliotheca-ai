import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Book } from '../../domain/book';
import { Copy, CopyStatus } from '../../domain/copy';
import { AlertRepository, BookRepository, BookSearch, CopyRepository } from '../../domain/ports';
import { AlertStatus, SecurityAlert } from '../../domain/security-alert';
import { BookOrmEntity, CopyOrmEntity, SecurityAlertOrmEntity } from './orm-entities';

@Injectable()
export class TypeOrmBookRepository implements BookRepository {
  constructor(@InjectRepository(BookOrmEntity) private readonly repo: Repository<BookOrmEntity>) {}

  private toDomain = (row: BookOrmEntity): Book =>
    Book.restore({ ...row, authors: row.authors ?? [], tags: row.tags ?? [] });

  async findById(id: string) {
    const row = await this.repo.findOneBy({ id });
    return row ? this.toDomain(row) : null;
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return (await this.repo.findBy({ id: In(ids) })).map(this.toDomain);
  }

  async findByIsbn(isbn: string) {
    const row = await this.repo.findOneBy({ isbn });
    return row ? this.toDomain(row) : null;
  }

  async search(query: BookSearch) {
    const qb = this.repo.createQueryBuilder('b');
    if (query.text?.trim()) {
      const words = query.text.trim().toLowerCase().split(/\s+/).slice(0, 6);
      words.forEach((word, i) => {
        qb.andWhere(
          `(LOWER(b.title) LIKE :w${i} OR LOWER(b.authors) LIKE :w${i} OR LOWER(b.tags) LIKE :w${i} OR LOWER(b.category) LIKE :w${i} OR b.isbn = :raw${i})`,
          { [`w${i}`]: `%${word}%`, [`raw${i}`]: word.replace(/-/g, '').toUpperCase() },
        );
      });
    }
    if (query.category) qb.andWhere('b.category = :category', { category: query.category });
    qb.orderBy('b.title', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map(this.toDomain), total };
  }

  async categories() {
    const rows = await this.repo
      .createQueryBuilder('b')
      .select('b.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('b.category')
      .orderBy('b.category', 'ASC')
      .getRawMany<{ category: string; count: string }>();
    return rows.map((r) => ({ category: r.category, count: Number(r.count) }));
  }

  async listAll() {
    return (await this.repo.find({ order: { title: 'ASC' } })).map(this.toDomain);
  }

  async save(book: Book) {
    await this.repo.save(this.repo.create(book.snapshot()));
  }

  count() {
    return this.repo.count();
  }
}

@Injectable()
export class TypeOrmCopyRepository implements CopyRepository {
  constructor(@InjectRepository(CopyOrmEntity) private readonly repo: Repository<CopyOrmEntity>) {}

  private toDomain = (row: CopyOrmEntity): Copy => Copy.restore({ ...row, status: row.status as CopyStatus });

  private async one(where: FindOptionsWhere<CopyOrmEntity>) {
    const row = await this.repo.findOneBy(where);
    return row ? this.toDomain(row) : null;
  }

  findById(id: string) { return this.one({ id }); }
  findByCode(code: string) { return this.one({ code }); }
  findByEpc(epc: string) { return this.one({ rfidEpc: epc }); }

  async findByBook(bookId: string) {
    return (await this.repo.find({ where: { bookId }, order: { code: 'ASC' } })).map(this.toDomain);
  }

  async findByBooks(bookIds: string[]) {
    if (bookIds.length === 0) return [];
    return (await this.repo.findBy({ bookId: In(bookIds) })).map(this.toDomain);
  }

  async findAll() {
    return (await this.repo.find({ order: { code: 'ASC' } })).map(this.toDomain);
  }

  async nextCode(): Promise<string> {
    const last = await this.repo.createQueryBuilder('c').select('MAX(c.code)', 'max').getRawOne<{ max: string | null }>();
    const current = Number(last?.max?.replace(/\D/g, '') ?? 0);
    return `BIB-${String(current + 1).padStart(5, '0')}`;
  }

  async save(copy: Copy) {
    await this.repo.save(this.repo.create(copy.snapshot()));
  }
}

@Injectable()
export class TypeOrmAlertRepository implements AlertRepository {
  constructor(@InjectRepository(SecurityAlertOrmEntity) private readonly repo: Repository<SecurityAlertOrmEntity>) {}

  private toDomain = (row: SecurityAlertOrmEntity) => SecurityAlert.restore({ ...row, status: row.status as AlertStatus });

  async findById(id: string) {
    const row = await this.repo.findOneBy({ id });
    return row ? this.toDomain(row) : null;
  }

  async list(status?: AlertStatus, limit = 100) {
    const rows = await this.repo.find({
      where: status ? { status } : {},
      order: { detectedAt: 'DESC' },
      take: limit,
    });
    return rows.map(this.toDomain);
  }

  async save(alert: SecurityAlert) {
    await this.repo.save(this.repo.create(alert.snapshot()));
  }
}
