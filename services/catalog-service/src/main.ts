import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './shared/bootstrap';

void bootstrapService(AppModule, {
  name: 'catalog-service',
  port: Number(process.env.PORT ?? 3002),
  title: 'Bibliotheca AI · Catalog & Asset Service',
  description: 'Gestión de libros, metadatos, ejemplares físicos, etiquetas RFID, inventario y alertas del arco de seguridad.',
});
