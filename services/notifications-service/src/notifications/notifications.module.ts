import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxQueries, NotifyUseCase, RecipientResolver } from './application/notification.use-cases';
import { CONTACT_DIRECTORY, NOTIFICATION_REPOSITORY, NOTIFICATION_SENDER, RECIPIENT_REPOSITORY } from './domain/ports';
import { HttpContactDirectory, N8nWebhookSender } from './infrastructure/external/adapters';
import { NotificationsController } from './infrastructure/http/controllers';
import { NotificationEventsConsumer } from './infrastructure/messaging/events.consumer';
import { NotificationOrmEntity, RecipientOrmEntity } from './infrastructure/persistence/orm-entities';
import { TypeOrmNotificationRepository, TypeOrmRecipientRepository } from './infrastructure/persistence/repositories';

export const NOTIFICATION_ENTITIES = [RecipientOrmEntity, NotificationOrmEntity];

@Module({
  imports: [TypeOrmModule.forFeature(NOTIFICATION_ENTITIES)],
  controllers: [NotificationsController],
  providers: [
    { provide: RECIPIENT_REPOSITORY, useClass: TypeOrmRecipientRepository },
    { provide: NOTIFICATION_REPOSITORY, useClass: TypeOrmNotificationRepository },
    { provide: CONTACT_DIRECTORY, useClass: HttpContactDirectory },
    { provide: NOTIFICATION_SENDER, useClass: N8nWebhookSender },
    RecipientResolver,
    NotifyUseCase,
    InboxQueries,
    NotificationEventsConsumer,
  ],
})
export class NotificationsModule {}
