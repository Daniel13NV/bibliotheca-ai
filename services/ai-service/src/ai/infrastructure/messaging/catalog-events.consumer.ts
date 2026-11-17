import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RabbitMqEventBus } from '../../../shared/rabbitmq.event-bus';
import { IndexingService } from '../../application/indexing.service';

/**
 * - Indexa cada libro nuevo o modificado (eventos catalog.book.*).
 * - Al arrancar, reintenta hasta que catálogo, Qdrant y Ollama estén listos y la colección esté completa.
 */
@Injectable()
export class CatalogIndexer implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CatalogIndexer.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly bus: RabbitMqEventBus,
    private readonly indexing: IndexingService,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe('ai-service.catalog', ['catalog.book.created', 'catalog.book.updated'], async (event) => {
      await this.indexing.indexBook(event.data as any);
    });
  }

  onApplicationBootstrap(): void {
    const attempt = async (n: number) => {
      try {
        if (await this.indexing.ensureIndexed()) {
          this.logger.log('Índice semántico listo');
          return;
        }
        this.logger.warn('El catálogo aún está vacío; reintentando');
      } catch (err) {
        this.logger.warn(`Índice no listo (${(err as Error).message}); reintento en 20 s [${n}]`);
      }
      this.timer = setTimeout(() => void attempt(n + 1), 20_000);
    };
    this.timer = setTimeout(() => void attempt(1), 5_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
