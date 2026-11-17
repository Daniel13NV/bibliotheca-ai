import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CATALOG_ENTITIES, CatalogModule } from './catalog/catalog.module';
import { mysqlConfig } from './shared/database';
import { HealthController } from './shared/health.controller';
import { MessagingModule } from './shared/messaging.module';

@Module({
  imports: [TypeOrmModule.forRoot(mysqlConfig(CATALOG_ENTITIES)), MessagingModule, CatalogModule],
  controllers: [HealthController],
})
export class AppModule {}
