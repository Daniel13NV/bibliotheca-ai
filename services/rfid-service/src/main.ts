import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './shared/bootstrap';

void bootstrapService(AppModule, {
  name: 'rfid-service',
  port: Number(process.env.PORT ?? 3004),
  title: 'Bibliotheca AI · RFID Telemetry Service',
  description: 'Ingesta en tiempo real de lecturas RFID (vía Node-RED), lectores, latidos y monitor en vivo.',
});
