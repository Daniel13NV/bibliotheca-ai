import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IntegrationEvent } from '../../../shared/event-publisher.port';
import { RabbitMqEventBus } from '../../../shared/rabbitmq.event-bus';
import { NotifyUseCase, RecipientResolver } from '../../application/notification.use-cases';

const USER_EVENTS = [
  'loan.created',
  'loan.renewed',
  'loan.returned',
  'loan.due_soon',
  'loan.overdue',
  'penalty.created',
  'penalty.paid',
  'penalty.waived',
];

@Injectable()
export class NotificationEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationEventsConsumer.name);

  constructor(
    private readonly bus: RabbitMqEventBus,
    private readonly notify: NotifyUseCase,
    private readonly recipients: RecipientResolver,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe(
      'notifications-service.events',
      ['user.registered', 'user.telegram_linked', 'catalog.security_alert', ...USER_EVENTS],
      (event) => this.handle(event),
    );
  }

  private async handle(event: IntegrationEvent<any>): Promise<void> {
    const data = event.data ?? {};
    switch (event.type) {
      case 'user.registered':
        await this.recipients.upsert({ userId: data.userId, name: data.name, email: data.email });
        return;
      case 'user.telegram_linked':
        await this.recipients.upsert({ userId: data.userId, name: data.name, chatId: data.chatId });
        await this.notify.toUser(event.type, data.userId, data);
        return;
      case 'catalog.security_alert':
        await this.notify.toStaff(event.type, data);
        return;
      default:
        if (USER_EVENTS.includes(event.type) && data.userId) {
          const result = await this.notify.toUser(event.type, data.userId, data);
          this.logger.debug(`${event.type} → ${result?.status}`);
        }
    }
  }
}
