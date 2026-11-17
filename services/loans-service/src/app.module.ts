import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LOANS_ENTITIES, LoansModule } from './loans/loans.module';
import { mysqlConfig } from './shared/database';
import { HealthController } from './shared/health.controller';
import { MessagingModule } from './shared/messaging.module';

@Module({
  imports: [TypeOrmModule.forRoot(mysqlConfig(LOANS_ENTITIES)), MessagingModule, LoansModule],
  controllers: [HealthController],
})
export class AppModule {}
