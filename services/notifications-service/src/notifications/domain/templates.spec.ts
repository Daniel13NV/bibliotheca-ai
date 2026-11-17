import { Notification } from './notification';
import { escapeHtml, renderTemplate } from './templates';

describe('Plantillas de notificación', () => {
  it('incluye botón de renovación en el recordatorio si se puede renovar', () => {
    const msg = renderTemplate('loan.due_soon', {
      loanId: 'L1',
      bookTitle: 'Cosmos',
      dueDate: '2026-11-10T23:59:59.000Z',
      daysLeft: 1,
      canRenew: true,
    })!;
    expect(msg.body).toContain('mañana');
    expect(msg.buttons[0].callbackData).toBe('renew:L1');
  });

  it('menciona la multa al devolver con atraso', () => {
    const msg = renderTemplate('loan.returned', { bookTitle: '1984', daysLate: 2, penaltyAmount: 10 })!;
    expect(msg.body).toContain('$10.00 MXN');
  });

  it('escapa HTML', () => {
    expect(escapeHtml('<b>&')).toBe('&lt;b&gt;&amp;');
  });

  it('devuelve null para eventos sin plantilla', () => {
    expect(renderTemplate('desconocido', {})).toBeNull();
  });
});

describe('Notification', () => {
  it('sin Telegram queda solo en la bandeja de la app', () => {
    const n = Notification.create({ id: '1', userId: 'u', chatId: null, type: 't', title: 'T', body: 'B', buttons: [] }, new Date());
    expect(n.shouldDeliver).toBe(false);
    expect(n.view().status).toBe('SKIPPED');
  });
});
