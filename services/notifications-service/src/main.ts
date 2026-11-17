import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './shared/bootstrap';

void bootstrapService(AppModule, {
  name: 'notifications-service',
  port: Number(process.env.PORT ?? 3005),
  title: 'Bibliotheca AI · Notifications Service',
  description: 'Convierte eventos (préstamos, multas, alertas RFID) en mensajes de Telegram vía n8n y en la bandeja de la app.',
});
