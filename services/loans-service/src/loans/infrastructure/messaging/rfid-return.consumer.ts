import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMqEventBus } from '../../../shared/rabbitmq.event-bus';
import { ReturnUseCase } from '../../application/circulation.use-cases';

/**
 * Buzón inteligente de devolución: cuando un lector RFID de tipo RETURN_BOX
 * detecta una etiqueta, el préstamo se cierra automáticamente.
 */
@Injectable()
export class RfidReturnConsumer implements OnModuleInit {
  constructor(
    private readonly bus: RabbitMqEventBus,
    private readonly returns: ReturnUseCase,
  ) {}

  onModuleInit(): void {
    this.bus.subscribe('loans-service.rfid', ['rfid.tag.read'], async (event) => {
      const data = event.data as { readerType?: string; epc?: string };
      if (data.readerType === 'RETURN_BOX' && data.epc) {
        await this.returns.byRfid(data.epc);
      }
    });
  }
}
