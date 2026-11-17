import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainError } from '../../shared/domain-error';
import { EVENT_PUBLISHER, EventPublisher } from '../../shared/event-publisher.port';
import { ReaderType } from '../domain/copy';
import { ALERT_REPOSITORY, AlertRepository, BOOK_REPOSITORY, BookRepository, COPY_REPOSITORY, CopyRepository } from '../domain/ports';
import { SecurityAlert } from '../domain/security-alert';
import { alertView } from './views';

export interface TagReadEvent {
  readerId: string;
  readerType: ReaderType;
  zone: string | null;
  epc: string;
  rssi?: number | null;
  readAt: string;
}

/**
 * Mantiene el estado de los ejemplares sincronizado con los eventos de otros contextos:
 * préstamos (loan.created / loan.returned) y telemetría RFID (rfid.tag.read).
 */
@Injectable()
export class CirculationSync {
  private readonly logger = new Logger(CirculationSync.name);

  constructor(
    @Inject(COPY_REPOSITORY) private readonly copies: CopyRepository,
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(ALERT_REPOSITORY) private readonly alerts: AlertRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async onLoanCreated(data: { copyId: string }) {
    const copy = await this.copies.findById(data.copyId);
    if (!copy) return this.logger.warn(`loan.created para ejemplar desconocido ${data.copyId}`);
    copy.markOnLoan();
    await this.copies.save(copy);
  }

  async onLoanReturned(data: { copyId: string }) {
    const copy = await this.copies.findById(data.copyId);
    if (!copy) return this.logger.warn(`loan.returned para ejemplar desconocido ${data.copyId}`);
    copy.markReturned();
    await this.copies.save(copy);
  }

  async onTagRead(event: TagReadEvent) {
    const copy = await this.copies.findByEpc(event.epc);
    if (!copy) return; // etiqueta ajena al catálogo (credencial, otro objeto…)

    copy.registerSighting(event.readerId, event.readerType === 'SHELF' ? event.zone : copy.snapshot().lastSeenZone, new Date(event.readAt));
    await this.copies.save(copy);

    if (copy.isUnauthorizedExit(event.readerType)) {
      const book = await this.books.findById(copy.bookId);
      const alert = SecurityAlert.raise({
        id: randomUUID(),
        copyId: copy.id,
        bookId: copy.bookId,
        bookTitle: book?.title ?? 'Desconocido',
        copyCode: copy.code,
        epc: event.epc,
        readerId: event.readerId,
        zone: event.zone,
        copyStatus: copy.status,
        detectedAt: new Date(event.readAt),
      });
      await this.alerts.save(alert);
      await this.events.publish('catalog.security_alert', alertView(alert));
      this.logger.warn(`¡Salida no autorizada! ${copy.code} (${book?.title}) en ${event.readerId}`);
    }
  }

  listAlerts(status?: 'OPEN' | 'RESOLVED') {
    return this.alerts.list(status, 100).then((list) => list.map(alertView));
  }

  async resolveAlert(alertId: string, by: string, notes: string | null) {
    const alert = await this.alerts.findById(alertId);
    if (!alert) throw DomainError.notFound('Alerta');
    alert.resolve(by, notes, new Date());
    await this.alerts.save(alert);
    return alertView(alert);
  }
}
