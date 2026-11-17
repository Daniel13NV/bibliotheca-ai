import { Reader } from './reader';
import { TagRead } from './tag-read';

export const READER_REPOSITORY = Symbol('READER_REPOSITORY');
export interface ReaderRepository {
  findById(id: string): Promise<Reader | null>;
  list(): Promise<Reader[]>;
  save(reader: Reader): Promise<void>;
  count(): Promise<number>;
}

export const TAG_READ_REPOSITORY = Symbol('TAG_READ_REPOSITORY');
export interface TagReadRepository {
  saveMany(reads: TagRead[]): Promise<void>;
  recent(filter: { readerId?: string; epc?: string; limit: number }): Promise<TagRead[]>;
  countByReaderSince(since: Date): Promise<Array<{ readerId: string; count: number }>>;
}

export const DEDUPLICATOR = Symbol('DEDUPLICATOR');
