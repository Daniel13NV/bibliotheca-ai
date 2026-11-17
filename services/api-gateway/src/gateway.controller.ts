import { Controller, Get } from '@nestjs/common';
import { SERVICE_ROUTES } from './routes';

@Controller()
export class GatewayController {
  @Get()
  index() {
    return {
      name: 'Bibliotheca AI · API Gateway',
      version: '1.0.0',
      docs: 'Cada microservicio publica su Swagger en http://localhost:300X/docs',
      routes: SERVICE_ROUTES.map((r) => ({ service: r.name, prefixes: r.prefixes })),
    };
  }

  /** Estado agregado de todo el ecosistema (útil para la demo y para el monitor de la app). */
  @Get('health')
  async health() {
    const checks = await Promise.all(
      SERVICE_ROUTES.map(async (route) => {
        const started = Date.now();
        try {
          const res = await fetch(`${route.target}/health`, { signal: AbortSignal.timeout(3000) });
          const body = (await res.json()) as Record<string, unknown>;
          return { ...body, service: route.name, status: res.ok ? 'up' : 'down', latencyMs: Date.now() - started };
        } catch (err) {
          return { service: route.name, status: 'down', latencyMs: Date.now() - started, error: (err as Error).message };
        }
      }),
    );
    return {
      status: checks.every((c) => c.status === 'up') ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      services: checks,
    };
  }
}
