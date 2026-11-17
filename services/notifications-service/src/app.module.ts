import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NOTIFICATION_ENTITIES, NotificationsModule } from './notifications/notifications.module';
import { mysqlConfig } from './shared/database';
import { HealthController } from './shared/health.controller';
import { MessagingModule } from './shared/messaging.module';

@Module({
  imports: [TypeOrmModule.forRoot(mysqlConfig(NOTIFICATION_ENTITIES)), MessagingModule, NotificationsModule],
  controllers: [HealthController],
})
export class AppModule {}
