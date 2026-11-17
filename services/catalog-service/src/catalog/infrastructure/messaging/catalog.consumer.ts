import { Injectable, OnModuleInit } from '@nestjs/common';
import { IntegrationEvent } from '../../../shared/event-publisher.port';
import { RabbitMqEventBus } from '../../../shared/rabbitmq.event-bus';
import { CirculationSync, TagReadEvent } from '../../application/circulation-sync';

/** Adaptador de entrada: traduce mensajes de RabbitMQ a casos de uso. */
@Injectable()
export class CatalogEventsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: RabbitMqEventBus,
    private readonly sync: CirculationSync,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe('catalog-service.events', ['loan.created', 'loan.returned', 'rfid.tag.read'], (event) =>
      this.handle(event),
    );
  }

  private async handle(event: IntegrationEvent<any>): Promise<void> {
    switch (event.type) {
      case 'loan.created':
        return this.sync.onLoanCreated(event.data);
      case 'loan.returned':
        return this.sync.onLoanReturned(event.data);
      case 'rfid.tag.read':
        return this.sync.onTagRead(event.data as TagReadEvent);
    }
  }
}
