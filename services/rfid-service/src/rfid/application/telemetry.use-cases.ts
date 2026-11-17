import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainError } from '../../shared/domain-error';
import { EVENT_PUBLISHER, EventPublisher } from '../../shared/event-publisher.port';
import { DEDUPLICATOR, READER_REPOSITORY, ReaderRepository, TAG_READ_REPOSITORY, TagReadRepository } from '../domain/ports';
import { ReadDeduplicator } from '../domain/read-deduplicator';
import { Reader, ReaderType } from '../domain/reader';
import { TagRead } from '../domain/tag-read';

export interface RawRead {
  epc: string;
  rssi?: number;
  antenna?: number;
  timestamp?: string;
}

/**
 * Ingesta en tiempo real: Node-RED normaliza los mensajes MQTT de los lectores
 * y los envía en lotes a este caso de uso.
 */
@Injectable()
export class IngestReadsUseCase {
  constructor(
    @Inject(READER_REPOSITORY) private readonly readers: ReaderRepository,
    @Inject(TAG_READ_REPOSITORY) private readonly reads: TagReadRepository,
    @Inject(DEDUPLICATOR) private readonly dedup: ReadDeduplicator,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(input: { readerId: string; reads: RawRead[] }) {
    const now = new Date();
    const reader = await this.readers.findById(input.readerId.trim().toUpperCase());
    if (!reader) throw DomainError.notFound(`Lector ${input.readerId}`);
    if (!reader.active) throw DomainError.rule(`El lector ${reader.id} está desactivado`);

    const accepted: TagRead[] = [];
    const rejected: Array<{ epc: string; reason: string }> = [];
    let duplicates = 0;

    for (const raw of input.reads) {
      let read: TagRead;
      try {
        read = TagRead.capture(
          {
            id: randomUUID(),
            readerId: reader.id,
            epc: raw.epc,
            rssi: raw.rssi,
            antenna: raw.antenna,
            readAt: raw.timestamp ? new Date(raw.timestamp) : undefined,
          },
          now,
        );
      } catch (err) {
        rejected.push({ epc: String(raw.epc), reason: (err as Error).message });
        continue;
      }
      if (!this.dedup.shouldAccept(reader.id, read.epc, read.readAt)) {
        duplicates++;
        continue;
      }
      accepted.push(read);
    }

    reader.registerActivity(now);
    await this.readers.save(reader);
    if (accepted.length === 0) return { readerId: reader.id, accepted: 0, duplicates, rejected };

    await this.reads.saveMany(accepted);
    for (const read of accepted) {
      const r = read.snapshot();
      await this.events.publish('rfid.tag.read', {
        readId: r.id,
        readerId: reader.id,
        readerType: reader.type,
        zone: reader.zone,
        epc: r.epc,
        rssi: r.rssi,
        antenna: r.antenna,
        readAt: r.readAt.toISOString(),
      });
    }
    return { readerId: reader.id, accepted: accepted.length, duplicates, rejected };
  }
}

@Injectable()
export class ReaderManagement {
  constructor(@Inject(READER_REPOSITORY) private readonly readers: ReaderRepository) {}

  async register(input: { id: string; name: string; type: ReaderType; zone: string; location: string }) {
    if (await this.readers.findById(input.id.trim().toUpperCase())) {
      throw DomainError.conflict(`Ya existe el lector ${input.id}`);
    }
    const reader = Reader.register(input, new Date());
    await this.readers.save(reader);
    return reader.view(new Date());
  }

  async update(id: string, changes: { name?: string; zone?: string; location?: string; active?: boolean; type?: ReaderType }) {
    const reader = await this.readers.findById(id);
    if (!reader) throw DomainError.notFound(`Lector ${id}`);
    reader.update(changes);
    await this.readers.save(reader);
    return reader.view(new Date());
  }

  async heartbeat(id: string) {
    const reader = await this.readers.findById(id.trim().toUpperCase());
    if (!reader) throw DomainError.notFound(`Lector ${id}`);
    reader.heartbeat(new Date());
    await this.readers.save(reader);
    return { readerId: reader.id, online: true };
  }

  async list() {
    const now = new Date();
    return (await this.readers.list()).map((r) => r.view(now));
  }
}

@Injectable()
export class TelemetryQueries {
  constructor(
    @Inject(READER_REPOSITORY) private readonly readers: ReaderRepository,
    @Inject(TAG_READ_REPOSITORY) private readonly reads: TagReadRepository,
  ) {}

  async recent(filter: { readerId?: string; epc?: string; limit?: number }) {
    const readers = new Map((await this.readers.list()).map((r) => [r.id, r]));
    const list = await this.reads.recent({ ...filter, limit: Math.min(filter.limit ?? 50, 500) });
    return list.map((read) => {
      const reader = readers.get(read.readerId);
      return { ...read.view(), readerType: reader?.type ?? null, zone: reader?.zone ?? null };
    });
  }

  async stats() {
    const now = new Date();
    const readers = await this.readers.list();
    const lastHour = await this.reads.countByReaderSince(new Date(now.getTime() - 3_600_000));
    return {
      readers: readers.length,
      online: readers.filter((r) => r.isOnline(now)).length,
      readsLastHour: lastHour.reduce((sum, r) => sum + r.count, 0),
      byReader: lastHour,
    };
  }
}
