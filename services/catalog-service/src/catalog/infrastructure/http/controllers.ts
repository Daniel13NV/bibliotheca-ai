import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, AuthUser, CurrentUser, Roles } from '../../../shared/auth';

/* Las consultas del catálogo están abiertas a visitantes (el Gateway las deja pasar sin sesión). */
import { CatalogCommands } from '../../application/catalog.commands';
import { CatalogQueries } from '../../application/catalog.queries';
import { CirculationSync } from '../../application/circulation-sync';
import {
  AddCopyDto,
  AlertsQuery,
  AssignTagDto,
  AvailabilityDto,
  ChangeStatusDto,
  CreateBookDto,
  InventoryQuery,
  LookupQuery,
  RelocateDto,
  ResolveAlertDto,
  SearchBooksQuery,
  UpdateBookDto,
} from './dto';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly queries: CatalogQueries,
    private readonly commands: CatalogCommands,
    private readonly sync: CirculationSync,
  ) {}

  // ----------------------------- Consulta -----------------------------
  @Get('books')
  @ApiOperation({ summary: 'Busca libros por texto (título, autor, tema, ISBN) con disponibilidad' })
  search(@Query() q: SearchBooksQuery) {
    return this.queries.search({ text: q.search, category: q.category, availableOnly: q.availableOnly, page: q.page, pageSize: q.pageSize });
  }

  @Get('books/:id')
  @ApiOperation({ summary: 'Detalle del libro con sus ejemplares y ubicación' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(id);
  }

  @Get('categories')
  categories() {
    return this.queries.categories();
  }

  @Get('copies/lookup')
  @Authenticated()
  @ApiOperation({ summary: 'Identifica un ejemplar escaneado (QR, NFC/RFID o id)' })
  lookup(@Query() q: LookupQuery) {
    return this.queries.lookupCopy(q.ref);
  }

  // ---------------------------- Gestión -------------------------------
  @Post('books')
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Alta de libro (opcionalmente con ejemplares)' })
  create(@Body() dto: CreateBookDto) {
    return this.commands.createBook({
      title: dto.title,
      authors: dto.authors,
      isbn: dto.isbn ?? null,
      publisher: dto.publisher ?? null,
      year: dto.year ?? null,
      category: dto.category,
      language: dto.language ?? 'Español',
      synopsis: dto.synopsis,
      coverUrl: dto.coverUrl ?? null,
      pages: dto.pages ?? null,
      tags: dto.tags ?? [],
      initialCopies: dto.initialCopies,
      zone: dto.zone,
      shelf: dto.shelf,
    });
  }

  @Patch('books/:id')
  @Roles('LIBRARIAN', 'ADMIN')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBookDto) {
    const { initialCopies, zone, shelf, ...changes } = dto;
    return this.commands.updateBook(id, changes);
  }

  @Post('books/:id/copies')
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Agrega un ejemplar físico' })
  addCopy(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddCopyDto) {
    return this.commands.addCopy(id, dto);
  }

  @Patch('copies/:id/rfid')
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Asigna la etiqueta RFID/NFC leída con el celular' })
  assignTag(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignTagDto) {
    return this.commands.assignTag(id, dto.epc);
  }

  @Patch('copies/:id/status')
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Mantenimiento, extravío o reserva de un ejemplar' })
  status(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto) {
    return this.commands.changeStatus(id, dto.status);
  }

  @Patch('copies/:id/location')
  @Roles('LIBRARIAN', 'ADMIN')
  relocate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RelocateDto) {
    return this.commands.relocate(id, dto.zone, dto.shelf);
  }

  // --------------------- Inventario y seguridad RFID -------------------
  @Get('inventory')
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Inventario automático: mal ubicados, no vistos y sin etiqueta' })
  inventory(@Query() q: InventoryQuery) {
    return this.queries.inventory(q.hours ?? 24);
  }

  @Get('alerts')
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Alertas de salida no autorizada detectadas por el arco RFID' })
  alerts(@Query() q: AlertsQuery) {
    return this.sync.listAlerts(q.status);
  }

  @Post('alerts/:id/resolve')
  @HttpCode(200)
  @Roles('LIBRARIAN', 'ADMIN')
  resolve(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveAlertDto) {
    return this.sync.resolveAlert(id, user.name || user.email, dto.notes ?? null);
  }
}

/** API interna para préstamos, IA y n8n. */
@ApiTags('internal')
@Controller('internal')
export class InternalCatalogController {
  constructor(private readonly queries: CatalogQueries) {}

  @Get('copies/lookup')
  lookup(@Query() q: LookupQuery) {
    return this.queries.lookupCopy(q.ref);
  }

  @Get('books')
  exportAll() {
    return this.queries.exportAll();
  }

  @Get('books/search')
  search(@Query() q: SearchBooksQuery) {
    return this.queries.search({ text: q.search, category: q.category, availableOnly: q.availableOnly, page: q.page, pageSize: q.pageSize });
  }

  @Get('books/:id')
  exportOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.exportOne(id);
  }

  @Post('books/availability')
  @HttpCode(200)
  availability(@Body() dto: AvailabilityDto) {
    return this.queries.availability(dto.ids);
  }
}
