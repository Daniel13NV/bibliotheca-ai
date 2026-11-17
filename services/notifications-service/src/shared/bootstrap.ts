import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GatewayAuthGuard } from './auth';
import { AllExceptionsFilter } from './exception.filter';

interface BootstrapOptions {
  name: string;
  port: number;
  title: string;
  description: string;
}

/** Arranque común: validación, errores, guard de seguridad interna y Swagger en /docs. */
export async function bootstrapService(module: unknown, options: BootstrapOptions) {
  const app = await NestFactory.create(module as never);
  app.enableCors();
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalGuards(new GatewayAuthGuard(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(
      `${options.description}\n\nPara probar directo (sin Gateway) envía las cabeceras x-internal-key, x-user-id y x-user-role.`,
    )
    .setVersion('1.0.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-internal-key' }, 'internal')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-user-id' }, 'userId')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-user-role' }, 'userRole')
    .addSecurityRequirements('internal')
    .addSecurityRequirements('userId')
    .addSecurityRequirements('userRole')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(options.port, '0.0.0.0');
  Logger.log(`${options.name} escuchando en :${options.port} — documentación en /docs`, 'Bootstrap');
  return app;
}
