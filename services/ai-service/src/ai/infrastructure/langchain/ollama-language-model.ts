import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatOllama } from '@langchain/ollama';
import { ChatTurn, SummaryLevel } from '../../domain/model';
import { LanguageModel } from '../../domain/ports';

/*
 * Cadenas LCEL (prompt → modelo → parser) sobre Ollama local.
 * Para cambiar a OpenAI bastaría otro adaptador que implemente LanguageModel
 * (por ejemplo con ChatOpenAI de @langchain/openai), sin tocar los casos de uso.
 */

const ASSISTANT_SYSTEM = `Eres "Biblio", el asistente virtual de la biblioteca universitaria Bibliotheca AI.
Ayudas a estudiantes a encontrar libros del catálogo y a entender de qué tratan.

Reglas:
- Recomienda ÚNICAMENTE libros que aparezcan en el CATÁLOGO RECUPERADO. Nunca inventes títulos, autores ni disponibilidad.
- Para cada recomendación escribe el título en negritas (**Título**), el autor, por qué encaja con lo que busca la persona y su disponibilidad (ejemplares disponibles y ubicación).
- Ordena las recomendaciones de la más adecuada a la menos adecuada y considera el nivel que pide la persona (principiante, universitario, etc.).
- Si el catálogo recuperado no contiene nada adecuado, dilo con honestidad y sugiere cómo reformular la búsqueda.
- Responde en español, con tono cercano y claro, en no más de 130 palabras salvo que pidan más detalle.
- Si la pregunta no tiene relación con libros o la biblioteca, responde brevemente y vuelve al tema.

CATÁLOGO RECUPERADO:
{context}`;

const SUMMARY_SYSTEM = `Eres "Biblio", asistente de una biblioteca universitaria. Generas resúmenes interactivos en español a partir de la ficha de un libro.
No inventes datos concretos que no estén en la ficha (nombres de capítulos, citas, fechas o personajes específicos). Puedes explicar los temas generales con tus palabras.`;

const SUMMARY_HUMAN = `Ficha del libro:
{book}

Nivel solicitado: {level}

Responde en Markdown con exactamente estas secciones:
## De qué trata
## Ideas clave
(3 a 5 viñetas)
## ¿Para quién es?
## Preguntas para reflexionar
(3 preguntas numeradas que inviten a seguir conversando sobre el libro)`;

const LEVEL_INSTRUCTIONS: Record<SummaryLevel, string> = {
  breve: 'Resumen breve, de unas 100 palabras en total, directo al punto.',
  detallado: 'Resumen detallado de unas 300 palabras, con contexto y relevancia del tema.',
  principiante:
    'Explica como a alguien sin conocimientos previos del tema: lenguaje sencillo, una analogía cotidiana y sin tecnicismos (o explícalos).',
};

const BOOK_QA_SYSTEM = `Eres "Biblio", asistente de una biblioteca universitaria. Respondes preguntas de un estudiante sobre un libro específico.
Usa la ficha del libro y tu conocimiento general del tema. Si te preguntan un detalle concreto del contenido que no aparece en la ficha, acláralo con honestidad en lugar de inventarlo.
Responde en español, claro y en no más de 150 palabras.

FICHA DEL LIBRO:
{book}`;

function toMessages(history: ChatTurn[]): BaseMessage[] {
  return history.map((t) => (t.role === 'user' ? new HumanMessage(t.content) : new AIMessage(t.content)));
}

@Injectable()
export class OllamaLanguageModel implements LanguageModel, OnApplicationBootstrap {
  private readonly logger = new Logger(OllamaLanguageModel.name);
  private readonly modelName = process.env.OLLAMA_CHAT_MODEL ?? 'llama3.2:3b';
  private readonly baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  private readonly parser = new StringOutputParser();

  /**
   * numCtx 2048 alcanza para 4 libros + historial; numPredict limita la longitud
   * de la respuesta. Ambos reducen bastante el tiempo en equipos sin GPU.
   */
  private model(temperature: number, numPredict: number) {
    return new ChatOllama({ model: this.modelName, baseUrl: this.baseUrl, temperature, numCtx: 2048, numPredict });
  }

  /** Carga el modelo en memoria al arrancar para que la primera pregunta no espere la carga. */
  onApplicationBootstrap(): void {
    const warmUp = async (attempt: number): Promise<void> => {
      try {
        const res = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: this.modelName, prompt: '', keep_alive: '1h' }),
          signal: AbortSignal.timeout(120_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.logger.log(`Modelo ${this.modelName} cargado en memoria`);
      } catch (err) {
        if (attempt < 10) setTimeout(() => void warmUp(attempt + 1), 30_000);
        else this.logger.warn(`No se pudo precargar el modelo: ${(err as Error).message}`);
      }
    };
    setTimeout(() => void warmUp(1), 10_000);
  }

  private readonly assistantChain = ChatPromptTemplate.fromMessages([
    ['system', ASSISTANT_SYSTEM],
    new MessagesPlaceholder('history'),
    ['human', '{question}'],
  ])
    .pipe(this.model(0.3, 320))
    .pipe(this.parser);

  private readonly summaryChain = ChatPromptTemplate.fromMessages([
    ['system', SUMMARY_SYSTEM],
    ['human', SUMMARY_HUMAN],
  ])
    .pipe(this.model(0.4, 450))
    .pipe(this.parser);

  private readonly bookQaChain = ChatPromptTemplate.fromMessages([
    ['system', BOOK_QA_SYSTEM],
    new MessagesPlaceholder('history'),
    ['human', '{question}'],
  ])
    .pipe(this.model(0.3, 250))
    .pipe(this.parser);

  answerWithCatalog(input: { question: string; history: ChatTurn[]; context: string }): Promise<string> {
    return this.assistantChain.invoke({
      context: input.context,
      question: input.question,
      history: toMessages(input.history),
    });
  }

  summarizeBook(input: { book: string; level: SummaryLevel }): Promise<string> {
    return this.summaryChain.invoke({ book: input.book, level: LEVEL_INSTRUCTIONS[input.level] });
  }

  answerAboutBook(input: { book: string; question: string; history: ChatTurn[] }): Promise<string> {
    return this.bookQaChain.invoke({ book: input.book, question: input.question, history: toMessages(input.history) });
  }

  async health() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const installed = (data.models ?? []).map((m) => m.name);
      const ok = installed.some((name) => name === this.modelName || name.startsWith(`${this.modelName}:`));
      return {
        ok,
        model: this.modelName,
        detail: ok ? 'Modelo disponible' : `Modelo no descargado. Instalados: ${installed.join(', ') || 'ninguno'}`,
      };
    } catch (err) {
      return { ok: false, model: this.modelName, detail: `Ollama no responde: ${(err as Error).message}` };
    }
  }
}
