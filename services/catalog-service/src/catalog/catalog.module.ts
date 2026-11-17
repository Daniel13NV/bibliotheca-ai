import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogCommands } from './application/catalog.commands';
import { CatalogQueries } from './application/catalog.queries';
import { CirculationSync } from './application/circulation-sync';
import { ALERT_REPOSITORY, BOOK_REPOSITORY, COPY_REPOSITORY } from './domain/ports';
import { CatalogController, InternalCatalogController } from './infrastructure/http/controllers';
import { CatalogEventsConsumer } from './infrastructure/messaging/catalog.consumer';
import { BookOrmEntity, CopyOrmEntity, SecurityAlertOrmEntity } from './infrastructure/persistence/orm-entities';
import {
  TypeOrmAlertRepository,
  TypeOrmBookRepository,
  TypeOrmCopyRepository,
} from './infrastructure/persistence/repositories';
import { CatalogSeeder } from './infrastructure/seed/catalog.seeder';

export const CATALOG_ENTITIES = [BookOrmEntity, CopyOrmEntity, SecurityAlertOrmEntity];

@Module({
  imports: [TypeOrmModule.forFeature(CATALOG_ENTITIES)],
  controllers: [CatalogController, InternalCatalogController],
  providers: [
    { provide: BOOK_REPOSITORY, useClass: TypeOrmBookRepository },
    { provide: COPY_REPOSITORY, useClass: TypeOrmCopyRepository },
    { provide: ALERT_REPOSITORY, useClass: TypeOrmAlertRepository },
    CatalogQueries,
    CatalogCommands,
    CirculationSync,
    CatalogEventsConsumer,
    CatalogSeeder,
  ],
})
export class CatalogModule {}
