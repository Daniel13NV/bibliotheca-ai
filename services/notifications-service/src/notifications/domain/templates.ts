import { NotificationButton } from './notification';

/**
 * Plantillas de mensajes por tipo de evento (lenguaje del dominio de la biblioteca).
 * Funciones puras: fáciles de probar y de cambiar sin tocar infraestructura.
 */
export interface RenderedMessage {
  title: string;
  body: string;
  buttons: NotificationButton[];
}

const TZ = process.env.TZ || 'America/Mexico_City';

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
}

export function money(amount: unknown, currency = 'MXN'): string {
  return `$${Number(amount ?? 0).toFixed(2)} ${currency}`;
}

function whenDue(daysLeft: number): string {
  if (daysLeft <= 0) return 'vence <b>hoy</b>';
  if (daysLeft === 1) return 'vence <b>mañana</b>';
  return `vence en <b>${daysLeft} días</b>`;
}

const renewButton = (loanId: string): NotificationButton => ({ text: '🔄 Renovar préstamo', callbackData: `renew:${loanId}` });
const loansButton: NotificationButton = { text: '📚 Mis préstamos', callbackData: 'cmd:misprestamos' };

type Data = Record<string, any>;

const TEMPLATES: Record<string, (d: Data) => RenderedMessage> = {
  'user.telegram_linked': (d) => ({
    title: '🤝 Cuenta vinculada',
    body: `Hola ${escapeHtml(d.name)}, desde ahora recibirás aquí tus recordatorios y podrás consultar y renovar tus préstamos.\nEscribe /ayuda para ver los comandos.`,
    buttons: [loansButton],
  }),
  'loan.created': (d) => ({
    title: '📚 Préstamo registrado',
    body: `Te llevaste <b>${escapeHtml(d.bookTitle)}</b> (${escapeHtml(d.copyCode)}).\nFecha límite: ${formatDate(d.dueDate)}. ¡Disfruta la lectura!`,
    buttons: [],
  }),
  'loan.renewed': (d) => ({
    title: '🔄 Préstamo renovado',
    body: `<b>${escapeHtml(d.bookTitle)}</b> ahora vence el ${formatDate(d.dueDate)} (renovación ${d.renewals}).`,
    buttons: [],
  }),
  'loan.returned': (d) => ({
    title: '✅ Devolución recibida',
    body:
      `Recibimos <b>${escapeHtml(d.bookTitle)}</b>${d.channel === 'RFID_RETURN_BOX' ? ' en el buzón inteligente' : ''}. ¡Gracias!` +
      (Number(d.penaltyAmount) > 0
        ? `\nSe entregó con ${d.daysLate} día(s) de atraso: se generó una multa de ${money(d.penaltyAmount)}.`
        : ''),
    buttons: [],
  }),
  'loan.due_soon': (d) => ({
    title: '⏰ Recordatorio de devolución',
    body: `<b>${escapeHtml(d.bookTitle)}</b> ${whenDue(Number(d.daysLeft))} (${formatDate(d.dueDate)}).` +
      (d.canRenew ? '\n¿Necesitas más tiempo? Renuévalo con un clic.' : '\nYa no tiene renovaciones disponibles.'),
    buttons: d.canRenew ? [renewButton(d.loanId)] : [],
  }),
  'loan.overdue': (d) => ({
    title: '⚠️ Préstamo vencido',
    body: `<b>${escapeHtml(d.bookTitle)}</b> venció el ${formatDate(d.dueDate)}.\nLlevas ${d.daysLate} día(s) de atraso y una multa acumulada de ${money(d.accruedFine, d.currency)}. Devuélvelo lo antes posible.`,
    buttons: [loansButton],
  }),
  'penalty.created': (d) => ({
    title: '💸 Multa generada',
    body: `Por ${d.daysLate} día(s) de atraso con <b>${escapeHtml(d.bookTitle)}</b> se generó una multa de ${money(d.amount, d.currency)}.\nPágala en el mostrador para volver a pedir libros.`,
    buttons: [],
  }),
  'penalty.paid': (d) => ({
    title: '🧾 Pago registrado',
    body: `Registramos el pago de tu multa por ${money(d.amount)}. ¡Ya puedes volver a pedir libros!`,
    buttons: [],
  }),
  'penalty.waived': (d) => ({
    title: '🧾 Multa condonada',
    body: `Tu multa por ${money(d.amount)} fue condonada.`,
    buttons: [],
  }),
  'catalog.security_alert': (d) => ({
    title: '🚨 Salida no autorizada',
    body: `<b>${escapeHtml(d.bookTitle)}</b> (${escapeHtml(d.copyCode)}) cruzó el arco <b>${escapeHtml(d.readerId)}</b> sin préstamo activo.\nEtiqueta: <code>${escapeHtml(d.epc)}</code> · Estado: ${escapeHtml(d.copyStatus)}`,
    buttons: [],
  }),
  test: (d) => ({
    title: '🔔 Notificación de prueba',
    body: `Hola ${escapeHtml(d.name)}, las notificaciones de Bibliotheca AI funcionan correctamente.`,
    buttons: [],
  }),
};

export const SUPPORTED_EVENTS = Object.keys(TEMPLATES).filter((k) => k.includes('.'));

export function renderTemplate(type: string, data: Data): RenderedMessage | null {
  const template = TEMPLATES[type];
  return template ? template(data) : null;
}
