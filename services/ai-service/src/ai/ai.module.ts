import { Module } from '@nestjs/common';
import { BookInsightsUseCase, LibrarianAssistantUseCase, SemanticSearchUseCase } from './application/assistant.use-cases';
import { IndexingService } from './application/indexing.service';
import { CATALOG_SOURCE, KNOWLEDGE_INDEX, LANGUAGE_MODEL } from './domain/ports';
import { HttpCatalogSource } from './infrastructure/external/catalog-http.source';
import { AiController, InternalAiController } from './infrastructure/http/controllers';
import { OllamaLanguageModel } from './infrastructure/langchain/ollama-language-model';
import { QdrantKnowledgeIndex } from './infrastructure/langchain/qdrant-knowledge-index';
import { CatalogIndexer } from './infrastructure/messaging/catalog-events.consumer';

@Module({
  controllers: [AiController, InternalAiController],
  providers: [
    { provide: KNOWLEDGE_INDEX, useClass: QdrantKnowledgeIndex },
    { provide: LANGUAGE_MODEL, useClass: OllamaLanguageModel },
    { provide: CATALOG_SOURCE, useClass: HttpCatalogSource },
    IndexingService,
    SemanticSearchUseCase,
    LibrarianAssistantUseCase,
    BookInsightsUseCase,
    CatalogIndexer,
  ],
})
export class AiModule {}
