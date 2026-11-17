import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RFID_ENTITIES, RfidModule } from './rfid/rfid.module';
import { mysqlConfig } from './shared/database';
import { HealthController } from './shared/health.controller';
import { MessagingModule } from './shared/messaging.module';

@Module({
  imports: [TypeOrmModule.forRoot(mysqlConfig(RFID_ENTITIES)), MessagingModule, RfidModule],
  controllers: [HealthController],
})
export class AppModule {}
