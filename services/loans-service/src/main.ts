import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './shared/bootstrap';

void bootstrapService(AppModule, {
  name: 'loans-service',
  port: Number(process.env.PORT ?? 3003),
  title: 'Bibliotheca AI · Loan & Penalty Service',
  description: 'Préstamos, devoluciones (mostrador, app y buzón RFID), renovaciones, cálculo de sanciones y recordatorios.',
});
