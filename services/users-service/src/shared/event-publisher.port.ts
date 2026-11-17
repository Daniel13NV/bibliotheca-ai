/**
 * Puerto de salida para publicar eventos de integración.
 * El dominio y los casos de uso dependen de esta interfaz, nunca de RabbitMQ.
 */
export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export interface IntegrationEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  source: string;
  occurredAt: string;
  data: T;
}

export interface EventPublisher {
  publish<T extends object>(type: string, data: T): Promise<void>;
}
