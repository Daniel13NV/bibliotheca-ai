import 'reflect-metadata';
import { AppModule } from './app.module';
import { bootstrapService } from './shared/bootstrap';

void bootstrapService(AppModule, {
  name: 'ai-service',
  port: Number(process.env.PORT ?? 3006),
  title: 'Bibliotheca AI · AI Service (RAG + LLM)',
  description: 'Búsqueda semántica con embeddings en Qdrant, asistente virtual RAG y resúmenes interactivos con LangChain + Ollama.',
});
