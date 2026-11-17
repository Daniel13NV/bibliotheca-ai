import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './shared/bootstrap';

void bootstrapService(AppModule, {
  name: 'users-service',
  port: Number(process.env.PORT ?? 3001),
  title: 'Bibliotheca AI · Users Service',
  description: 'Identidad de estudiantes y personal, autenticación JWT y vinculación con Telegram.',
});
