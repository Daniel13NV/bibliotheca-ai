import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { READER_REPOSITORY, ReaderRepository } from '../../domain/ports';
import { Reader, ReaderType } from '../../domain/reader';

/** Lectores de la biblioteca de demostración (deben coincidir con el simulador de Node-RED). */
export const SEED_READERS: Array<{ id: string; name: string; type: ReaderType; zone: string; location: string }> = [
  { id: 'GATE-01', name: 'Arco de seguridad · Salida principal', type: 'GATE', zone: 'Acceso', location: 'Planta baja, puerta principal' },
  { id: 'DESK-01', name: 'Mostrador de préstamo', type: 'DESK', zone: 'Circulación', location: 'Planta baja, mostrador' },
  { id: 'RETURN-01', name: 'Buzón inteligente de devolución', type: 'RETURN_BOX', zone: 'Acceso', location: 'Exterior, junto a la entrada' },
  { id: 'SHELF-A', name: 'Estante inteligente A · Ciencias', type: 'SHELF', zone: 'Ciencias', location: 'Planta 1, pasillo A' },
  { id: 'SHELF-B', name: 'Estante inteligente B · Literatura', type: 'SHELF', zone: 'Literatura', location: 'Planta 1, pasillo B' },
  { id: 'SHELF-C', name: 'Estante inteligente C · Tecnología', type: 'SHELF', zone: 'Tecnología', location: 'Planta 2, pasillo C' },
  { id: 'SHELF-D', name: 'Estante inteligente D · Humanidades', type: 'SHELF', zone: 'Humanidades', location: 'Planta 2, pasillo D' },
];

@Injectable()
export class ReadersSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(@Inject(READER_REPOSITORY) private readonly readers: ReaderRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_DATA === 'false' || (await this.readers.count()) > 0) return;
    for (const seed of SEED_READERS) {
      await this.readers.save(Reader.register(seed, new Date()));
    }
    this.logger.log(`Lectores RFID registrados: ${SEED_READERS.map((r) => r.id).join(', ')}`);
  }
}
