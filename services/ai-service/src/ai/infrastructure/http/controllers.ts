import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, Roles } from '../../../shared/auth';
import { BookInsightsUseCase, LibrarianAssistantUseCase, SemanticSearchUseCase } from '../../application/assistant.use-cases';
import { IndexingService } from '../../application/indexing.service';
import { LANGUAGE_MODEL, LanguageModel } from '../../domain/ports';
import { ChatDto, ReindexDto, SearchDto, SummaryDto } from './dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly search: SemanticSearchUseCase,
    private readonly assistant: LibrarianAssistantUseCase,
    private readonly insights: BookInsightsUseCase,
    private readonly indexing: IndexingService,
    @Inject(LANGUAGE_MODEL) private readonly llm: LanguageModel,
  ) {}

  @Post('search')
  @HttpCode(200)
  @Authenticated()
  @ApiOperation({ summary: 'Búsqueda semántica en el catálogo (pgvector/Qdrant + embeddings)' })
  async semantic(@Body() dto: SearchDto) {
    const { query, results } = await this.search.execute(dto.query, dto.limit ?? 5);
    return { query, results };
  }

  @Post('chat')
  @HttpCode(200)
  @Authenticated()
  @ApiOperation({ summary: 'Asistente virtual (RAG): recomienda libros reales del catálogo' })
  chat(@Body() dto: ChatDto) {
    return this.assistant.execute({ question: dto.question, history: dto.history });
  }

  @Post('books/:id/summary')
  @HttpCode(200)
  @Authenticated()
  @ApiOperation({ summary: 'Resumen interactivo (breve, detallado o para principiantes)' })
  summary(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SummaryDto) {
    return this.insights.summarize(id, dto.level ?? 'breve');
  }

  @Post('books/:id/ask')
  @HttpCode(200)
  @Authenticated()
  @ApiOperation({ summary: 'Pregunta de seguimiento sobre un libro' })
  ask(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChatDto) {
    return this.insights.ask(id, dto.question, dto.history);
  }

  @Get('status')
  @Authenticated()
  async status() {
    const [index, llm] = await Promise.all([this.indexing.status(), this.llm.health()]);
    return { ...index, llm };
  }

  @Post('reindex')
  @HttpCode(200)
  @Roles('LIBRARIAN', 'ADMIN')
  reindex(@Body() dto: ReindexDto) {
    return this.indexing.reindexAll(dto.reset ?? false);
  }
}

/** Para n8n (bot de Telegram): misma lógica, sin usuario de la app. */
@ApiTags('internal')
@Controller('internal/ai')
export class InternalAiController {
  constructor(
    private readonly search: SemanticSearchUseCase,
    private readonly assistant: LibrarianAssistantUseCase,
  ) {}

  @Post('search')
  @HttpCode(200)
  async semantic(@Body() dto: SearchDto) {
    const { query, results } = await this.search.execute(dto.query, dto.limit ?? 5);
    return { query, results };
  }

  @Post('chat')
  @HttpCode(200)
  chat(@Body() dto: ChatDto) {
    return this.assistant.execute({ question: dto.question, history: dto.history });
  }
}
