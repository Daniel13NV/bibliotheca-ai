import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './auth';
import { RabbitMqEventBus } from './rabbitmq.event-bus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly bus: RabbitMqEventBus) {}

  @Public()
  @Get()
  health() {
    return {
      status: 'ok',
      service: process.env.SERVICE_NAME,
      rabbitmq: this.bus.isConnected ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    };
  }
}
