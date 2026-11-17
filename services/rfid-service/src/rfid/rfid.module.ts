import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngestReadsUseCase, ReaderManagement, TelemetryQueries } from './application/telemetry.use-cases';
import { DEDUPLICATOR, READER_REPOSITORY, TAG_READ_REPOSITORY } from './domain/ports';
import { ReadDeduplicator } from './domain/read-deduplicator';
import { RfidController, RfidIngestController } from './infrastructure/http/controllers';
import { ReaderOrmEntity, TagReadOrmEntity } from './infrastructure/persistence/orm-entities';
import { TypeOrmReaderRepository, TypeOrmTagReadRepository } from './infrastructure/persistence/repositories';
import { ReadersSeeder } from './infrastructure/seed/readers.seeder';

export const RFID_ENTITIES = [ReaderOrmEntity, TagReadOrmEntity];

@Module({
  imports: [TypeOrmModule.forFeature(RFID_ENTITIES)],
  controllers: [RfidController, RfidIngestController],
  providers: [
    { provide: READER_REPOSITORY, useClass: TypeOrmReaderRepository },
    { provide: TAG_READ_REPOSITORY, useClass: TypeOrmTagReadRepository },
    { provide: DEDUPLICATOR, useFactory: () => new ReadDeduplicator(Number(process.env.RFID_DEDUP_WINDOW_MS ?? 5000)) },
    IngestReadsUseCase,
    ReaderManagement,
    TelemetryQueries,
    ReadersSeeder,
  ],
})
export class RfidModule {}
