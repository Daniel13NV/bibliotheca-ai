import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mysqlConfig } from './shared/database';
import { HealthController } from './shared/health.controller';
import { MessagingModule } from './shared/messaging.module';
import { UserOrmEntity } from './users/infrastructure/persistence/user.orm-entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [TypeOrmModule.forRoot(mysqlConfig([UserOrmEntity])), MessagingModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule {}
