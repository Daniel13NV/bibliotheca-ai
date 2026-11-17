import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../shared/domain-error';
import {
  ChatTurn,
  describeForContext,
  MIN_RELEVANCE,
  RecommendedBook,
  SearchHit,
  SummaryLevel,
  toDocument,
} from '../domain/model';
import { CATALOG_SOURCE, CatalogSource, KNOWLEDGE_INDEX, KnowledgeIndex, LANGUAGE_MODEL, LanguageModel } from '../domain/ports';

const sanitizeHistory = (history: ChatTurn[] = []) =>
  history
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && t.content?.trim())
    .slice(-6)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 1500) }));

/** Búsqueda semántica: "un libro de física cuántica para principiantes". */
@Injectable()
export class SemanticSearchUseCase {
  constructor(
    @Inject(KNOWLEDGE_INDEX) private readonly index: KnowledgeIndex,
    @Inject(CATALOG_SOURCE) private readonly catalog: CatalogSource,
  ) {}

  async execute(query: string, limit = 5): Promise<{ query: string; results: RecommendedBook[]; hits: SearchHit[] }> {
    const text = query.trim();
    if (text.length < 3) throw DomainError.validation('Escribe al menos 3 caracteres');
    const hits = (await this.index.search(text, Math.min(limit, 10))).filter((h) => h.score >= MIN_RELEVANCE);
    const availability = hits.length ? await this.catalog.availability(hits.map((h) => h.book.bookId)).catch(() => ({})) : {};
    const results = hits.map<RecommendedBook>((h) => ({
      bookId: h.book.bookId,
      title: h.book.title,
      authors: h.book.authors,
      category: h.book.category,
      score: Number(h.score.toFixed(3)),
      availability: (availability as Record<string, RecommendedBook['availability']>)[h.book.bookId] ?? null,
    }));
    return { query: text, results, hits };
  }
}

/** Asistente virtual con RAG: recupera libros del catálogo y el LLM redacta la recomendación. */
@Injectable()
export class LibrarianAssistantUseCase {
  private readonly logger = new Logger(LibrarianAssistantUseCase.name);

  constructor(
    private readonly search: SemanticSearchUseCase,
    @Inject(LANGUAGE_MODEL) private readonly llm: LanguageModel,
  ) {}

  async execute(input: { question: string; history?: ChatTurn[] }) {
    const question = input.question.trim();
    if (!question) throw DomainError.validation('La pregunta está vacía');
    const history = sanitizeHistory(input.history);

    // La consulta de recuperación incluye el último mensaje del usuario para dar continuidad.
    const lastUser = [...history].reverse().find((t) => t.role === 'user')?.content ?? '';
    const retrievalQuery = question.length < 25 && lastUser ? `${lastUser}. ${question}` : question;
    const { results, hits } = await this.search.execute(retrievalQuery, 5);

    const context = results.length
      ? results
          .slice(0, 4)
          .map((book, i) => describeForContext(i + 1, book, hits[i].book))
          .join('\n\n')
      : 'No se encontraron libros relevantes en el catálogo para esta consulta.';

    let answer: string;
    let llmAvailable = true;
    try {
      answer = await this.llm.answerWithCatalog({ question, history, context });
    } catch (err) {
      llmAvailable = false;
      this.logger.warn(`LLM no disponible: ${(err as Error).message}`);
      answer = results.length
        ? `No pude contactar al modelo de lenguaje, pero estos libros del catálogo coinciden con tu búsqueda:\n` +
          results.map((b) => `• **${b.title}** — ${b.authors.join(', ')} (${b.availability?.available ?? '?'} disponibles)`).join('\n')
        : 'No encontré libros relacionados en el catálogo. Intenta describir el tema con otras palabras.';
    }
    return { answer, books: results, llmAvailable };
  }
}

/** Resúmenes interactivos de un libro y preguntas de seguimiento. */
@Injectable()
export class BookInsightsUseCase {
  private readonly summaries = new Map<string, { text: string; at: number }>();

  constructor(
    @Inject(CATALOG_SOURCE) private readonly catalog: CatalogSource,
    @Inject(LANGUAGE_MODEL) private readonly llm: LanguageModel,
  ) {}

  private async card(bookId: string) {
    const book = await this.catalog.getBook(bookId);
    if (!book) throw DomainError.notFound('Libro');
    const doc = toDocument(book);
    return {
      book,
      card: [
        `Título: ${doc.title}`,
        `Autores: ${doc.authors.join(', ')}`,
        book.publisher ? `Editorial: ${book.publisher}` : '',
        doc.year ? `Año: ${doc.year}` : '',
        book.pages ? `Páginas: ${book.pages}` : '',
        `Categoría: ${doc.category}`,
        `Temas: ${doc.tags.join(', ')}`,
        `Sinopsis: ${doc.synopsis}`,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  async summarize(bookId: string, level: SummaryLevel) {
    const key = `${bookId}:${level}`;
    const cached = this.summaries.get(key);
    const { book, card } = await this.card(bookId);
    if (cached && Date.now() - cached.at < 6 * 3_600_000) {
      return { bookId, title: book.title, level, summary: cached.text, cached: true };
    }
    try {
      const summary = await this.llm.summarizeBook({ book: card, level });
      this.summaries.set(key, { text: summary, at: Date.now() });
      return { bookId, title: book.title, level, summary, cached: false };
    } catch (err) {
      throw DomainError.unavailable(`El modelo de lenguaje no está disponible: ${(err as Error).message}`);
    }
  }

  async ask(bookId: string, question: string, history: ChatTurn[] = []) {
    if (!question.trim()) throw DomainError.validation('La pregunta está vacía');
    const { book, card } = await this.card(bookId);
    try {
      const answer = await this.llm.answerAboutBook({ book: card, question, history: sanitizeHistory(history) });
      return { bookId, title: book.title, answer };
    } catch (err) {
      throw DomainError.unavailable(`El modelo de lenguaje no está disponible: ${(err as Error).message}`);
    }
  }
}
