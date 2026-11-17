import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { HealthController } from './shared/health.controller';
import { MessagingModule } from './shared/messaging.module';

@Module({
  imports: [MessagingModule, AiModule],
  controllers: [HealthController],
})
export class AppModule {}
