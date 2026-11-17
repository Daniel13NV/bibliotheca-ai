/**
 * Tabla de enrutamiento del API Gateway: prefijo público → microservicio.
 * Las rutas /internal/* nunca se exponen hacia afuera.
 */
export interface ServiceRoute {
  name: string;
  target: string;
  prefixes: string[];
  /** Tiempo máximo de espera (el LLM puede tardar en equipos sin GPU). */
  timeoutMs: number;
}

export const SERVICE_ROUTES: ServiceRoute[] = [
  { name: 'users-service', target: process.env.USERS_URL ?? 'http://localhost:3001', prefixes: ['/auth', '/users'], timeoutMs: 15_000 },
  { name: 'catalog-service', target: process.env.CATALOG_URL ?? 'http://localhost:3002', prefixes: ['/catalog'], timeoutMs: 15_000 },
  { name: 'loans-service', target: process.env.LOANS_URL ?? 'http://localhost:3003', prefixes: ['/loans', '/penalties'], timeoutMs: 15_000 },
  { name: 'rfid-service', target: process.env.RFID_URL ?? 'http://localhost:3004', prefixes: ['/rfid'], timeoutMs: 15_000 },
  { name: 'notifications-service', target: process.env.NOTIFICATIONS_URL ?? 'http://localhost:3005', prefixes: ['/notifications'], timeoutMs: 15_000 },
  { name: 'ai-service', target: process.env.AI_URL ?? 'http://localhost:3006', prefixes: ['/ai'], timeoutMs: 180_000 },
];

/** Rutas que no requieren JWT. */
export const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/register' },
];

/**
 * Rutas de consulta abiertas a visitantes: el catálogo se puede explorar sin cuenta.
 * Si llega un token válido se propaga la identidad; si no, la petición sigue como invitado.
 */
export const GUEST_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: 'GET', pattern: /^\/catalog\/books\/?$/ },
  { method: 'GET', pattern: /^\/catalog\/books\/[0-9a-f-]{36}\/?$/i },
  { method: 'GET', pattern: /^\/catalog\/categories\/?$/ },
];
