import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';
import { EventPublisher, IntegrationEvent } from './event-publisher.port';

/**
 * Adaptador de mensajería asíncrona sobre RabbitMQ.
 *  - Exchange tipo "topic": bibliotheca.events (routing key = tipo de evento).
 *  - Cada servicio consume desde su propia cola durable.
 *  - Los mensajes que fallan van a la cola de mensajes muertos (bibliotheca.dead-letters).
 *  - Si RabbitMQ no está disponible, los eventos se guardan en memoria y se envían al reconectar.
 */
export const EVENTS_EXCHANGE = 'bibliotheca.events';
const DEAD_LETTER_EXCHANGE = 'bibliotheca.dlx';
const DEAD_LETTER_QUEUE = 'bibliotheca.dead-letters';

type Connection = Awaited<ReturnType<typeof amqp.connect>>;
export type EventHandler = (event: IntegrationEvent<any>) => Promise<void>;

interface Subscription {
  queue: string;
  patterns: string[];
  handler: EventHandler;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class RabbitMqEventBus implements EventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('RabbitMQ');
  private readonly url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
  private readonly source = process.env.SERVICE_NAME ?? 'unknown-service';
  private connection?: Connection;
  private channel?: amqp.ConfirmChannel;
  private readonly pending: IntegrationEvent[] = [];
  private readonly subscriptions: Subscription[] = [];
  private connecting = false;
  private closing = false;

  onModuleInit(): void {
    // No bloquea el arranque del servicio: se conecta en segundo plano.
    void this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  get isConnected(): boolean {
    return Boolean(this.channel);
  }

  async publish<T extends object>(type: string, data: T): Promise<void> {
    const event: IntegrationEvent = {
      id: randomUUID(),
      type,
      source: this.source,
      occurredAt: new Date().toISOString(),
      data: data as unknown as Record<string, unknown>,
    };
    if (!this.channel) {
      this.pending.push(event);
      this.logger.warn(`RabbitMQ no disponible: evento ${type} en espera (${this.pending.length})`);
      return;
    }
    try {
      await this.send(this.channel, event);
    } catch (err) {
      this.pending.push(event);
      this.logger.error(`No se pudo publicar ${type}: ${(err as Error).message}`);
    }
  }

  /** Registra un consumidor. Puede llamarse antes o después de conectar. */
  subscribe(queue: string, patterns: string[], handler: EventHandler): void {
    const subscription: Subscription = { queue, patterns, handler };
    this.subscriptions.push(subscription);
    if (this.channel) {
      void this.setupSubscription(this.channel, subscription).catch((err) =>
        this.logger.error(`No se pudo suscribir ${queue}: ${(err as Error).message}`),
      );
    }
  }

  private async send(channel: amqp.ConfirmChannel, event: IntegrationEvent): Promise<void> {
    channel.publish(EVENTS_EXCHANGE, event.type, Buffer.from(JSON.stringify(event)), {
      contentType: 'application/json',
      persistent: true,
      messageId: event.id,
      type: event.type,
      appId: event.source,
      timestamp: Date.now(),
    });
    await channel.waitForConfirms();
    this.logger.debug(`Publicado ${event.type}`);
  }

  private async connect(): Promise<void> {
    if (this.connecting || this.closing) return;
    this.connecting = true;
    let attempt = 0;
    while (!this.closing) {
      try {
        const connection = await amqp.connect(this.url);
        const channel = await connection.createConfirmChannel();
        connection.on('error', (err: Error) => this.logger.error(`Conexión: ${err.message}`));
        connection.on('close', () => {
          this.channel = undefined;
          this.connection = undefined;
          if (!this.closing) {
            this.logger.warn('Conexión cerrada, reintentando en 3 s');
            setTimeout(() => void this.connect(), 3000);
          }
        });

        await channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
        await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'fanout', { durable: true });
        await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
        await channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, '');
        await channel.prefetch(10);

        for (const subscription of this.subscriptions) {
          await this.setupSubscription(channel, subscription);
        }
        this.connection = connection;
        this.channel = channel;

        while (this.pending.length > 0) {
          const event = this.pending.shift()!;
          await this.send(channel, event);
        }
        this.logger.log(`Conectado a RabbitMQ (${this.subscriptions.length} suscripciones)`);
        break;
      } catch (err) {
        attempt += 1;
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
        this.logger.warn(`Sin conexión a RabbitMQ (${(err as Error).message}); reintento en ${delay} ms`);
        await sleep(delay);
      }
    }
    this.connecting = false;
  }

  private async setupSubscription(channel: amqp.ConfirmChannel, subscription: Subscription): Promise<void> {
    const { queue, patterns, handler } = subscription;
    await channel.assertQueue(queue, { durable: true, deadLetterExchange: DEAD_LETTER_EXCHANGE });
    for (const pattern of patterns) {
      await channel.bindQueue(queue, EVENTS_EXCHANGE, pattern);
    }
    await channel.consume(queue, async (message: amqp.ConsumeMessage | null) => {
      if (!message) return;
      try {
        const event = JSON.parse(message.content.toString()) as IntegrationEvent;
        await handler(event);
        channel.ack(message);
      } catch (err) {
        this.logger.error(`Error procesando ${message.fields.routingKey}: ${(err as Error).message}`);
        channel.nack(message, false, false); // → cola de mensajes muertos
      }
    });
    this.logger.log(`Cola ${queue} escuchando [${patterns.join(', ')}]`);
  }
}
