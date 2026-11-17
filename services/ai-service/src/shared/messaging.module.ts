import { Global, Module } from '@nestjs/common';
import { EVENT_PUBLISHER } from './event-publisher.port';
import { RabbitMqEventBus } from './rabbitmq.event-bus';

@Global()
@Module({
  providers: [RabbitMqEventBus, { provide: EVENT_PUBLISHER, useExisting: RabbitMqEventBus }],
  exports: [RabbitMqEventBus, EVENT_PUBLISHER],
})
export class MessagingModule {}
