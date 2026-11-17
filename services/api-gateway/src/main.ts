import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app.module';
import { authMiddleware } from './auth.middleware';
import { SERVICE_ROUTES } from './routes';

async function bootstrap() {
  // bodyParser desactivado: el cuerpo se reenvía intacto al microservicio.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const logger = new Logger('Gateway');
  app.enableCors();

  app.use(authMiddleware(app.get(JwtService)));

  for (const route of SERVICE_ROUTES) {
    app.use(
      createProxyMiddleware<Request, Response>({
        target: route.target,
        changeOrigin: true,
        pathFilter: route.prefixes,
        proxyTimeout: route.timeoutMs,
        timeout: route.timeoutMs,
        on: {
          error: (err, _req, res) => {
            logger.error(`${route.name} no disponible: ${err.message}`);
            const response = res as Response;
            if (typeof response.status === 'function' && !response.headersSent) {
              response.status(503).json({ statusCode: 503, message: `El servicio ${route.name} no está disponible` });
            }
          },
        },
      }),
    );
    logger.log(`${route.prefixes.join(', ')} → ${route.target}`);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway escuchando en http://localhost:${port}`);
}

void bootstrap();
