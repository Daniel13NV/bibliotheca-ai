import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ReaderRepository, TagReadRepository } from '../../domain/ports';
import { Reader, ReaderType } from '../../domain/reader';
import { TagRead } from '../../domain/tag-read';
import { ReaderOrmEntity, TagReadOrmEntity } from './orm-entities';

@Injectable()
export class TypeOrmReaderRepository implements ReaderRepository {
  constructor(@InjectRepository(ReaderOrmEntity) private readonly repo: Repository<ReaderOrmEntity>) {}

  private toDomain = (row: ReaderOrmEntity) => Reader.restore({ ...row, type: row.type as ReaderType });

  async findById(id: string) {
    const row = await this.repo.findOneBy({ id });
    return row ? this.toDomain(row) : null;
  }

  async list() {
    return (await this.repo.find({ order: { id: 'ASC' } })).map(this.toDomain);
  }

  async save(reader: Reader) {
    await this.repo.save(this.repo.create(reader.snapshot()));
  }

  count() {
    return this.repo.count();
  }
}

@Injectable()
export class TypeOrmTagReadRepository implements TagReadRepository {
  constructor(@InjectRepository(TagReadOrmEntity) private readonly repo: Repository<TagReadOrmEntity>) {}

  async saveMany(reads: TagRead[]) {
    await this.repo.insert(reads.map((r) => r.snapshot()));
  }

  async recent(filter: { readerId?: string; epc?: string; limit: number }) {
    const where: FindOptionsWhere<TagReadOrmEntity> = {};
    if (filter.readerId) where.readerId = filter.readerId;
    if (filter.epc) where.epc = filter.epc;
    const rows = await this.repo.find({ where, order: { readAt: 'DESC' }, take: filter.limit });
    return rows.map((row) => TagRead.restore(row));
  }

  async countByReaderSince(since: Date) {
    const rows = await this.repo
      .createQueryBuilder('t')
      .select('t.reader_id', 'readerId')
      .addSelect('COUNT(*)', 'count')
      .where('t.read_at >= :since', { since })
      .groupBy('t.reader_id')
      .getRawMany<{ readerId: string; count: string }>();
    return rows.map((r) => ({ readerId: r.readerId, count: Number(r.count) }));
  }
}
