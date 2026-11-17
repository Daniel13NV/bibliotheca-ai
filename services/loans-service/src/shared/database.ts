import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

/** Configuración MySQL común; cada servicio tiene su propia base de datos. */
export function mysqlConfig(entities: Function[]): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER ?? 'bibliotheca',
    password: process.env.DB_PASSWORD ?? 'bibliotheca123',
    database: process.env.DB_NAME,
    entities,
    synchronize: (process.env.DB_SYNC ?? 'true') === 'true',
    retryAttempts: 30,
    retryDelay: 3000,
    timezone: 'Z',
    charset: 'utf8mb4_unicode_ci',
  };
}
