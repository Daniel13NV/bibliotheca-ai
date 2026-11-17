import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/auth';
import { IngestReadsUseCase, ReaderManagement, TelemetryQueries } from '../../application/telemetry.use-cases';
import { CreateReaderDto, IngestDto, RecentQuery, SimulateDto, UpdateReaderDto } from './dto';

@ApiTags('rfid')
@Controller('rfid')
export class RfidController {
  constructor(
    private readonly readers: ReaderManagement,
    private readonly queries: TelemetryQueries,
    private readonly ingest: IngestReadsUseCase,
  ) {}

  @Get('readers')
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Lectores con estado en línea / fuera de línea' })
  list() {
    return this.readers.list();
  }

  @Post('readers')
  @Roles('ADMIN')
  create(@Body() dto: CreateReaderDto) {
    return this.readers.register(dto);
  }

  @Patch('readers/:id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateReaderDto) {
    return this.readers.update(id, dto);
  }

  @Get('reads')
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Últimas lecturas (monitor en vivo)' })
  recent(@Query() q: RecentQuery) {
    return this.queries.recent({ readerId: q.readerId, epc: q.epc?.toUpperCase(), limit: q.limit });
  }

  @Get('stats')
  @Roles('LIBRARIAN', 'ADMIN')
  stats() {
    return this.queries.stats();
  }

  @Post('simulate')
  @HttpCode(200)
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Simula una lectura desde la app (para demostraciones sin hardware)' })
  simulate(@Body() dto: SimulateDto) {
    return this.ingest.execute({ readerId: dto.readerId, reads: [{ epc: dto.epc, rssi: -45, antenna: 1 }] });
  }
}

/** Entrada de telemetría desde Node-RED (x-internal-key). */
@ApiTags('internal')
@Controller('internal/rfid')
export class RfidIngestController {
  constructor(
    private readonly ingest: IngestReadsUseCase,
    private readonly readers: ReaderManagement,
  ) {}

  @Post('ingest')
  @HttpCode(200)
  @ApiOperation({ summary: 'Lote de lecturas normalizadas por Node-RED' })
  ingestBatch(@Body() dto: IngestDto) {
    return this.ingest.execute(dto);
  }

  @Post('readers/:id/heartbeat')
  @HttpCode(200)
  heartbeat(@Param('id') id: string) {
    return this.readers.heartbeat(id);
  }
}
