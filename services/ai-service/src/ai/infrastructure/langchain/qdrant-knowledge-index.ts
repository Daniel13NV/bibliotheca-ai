import { Injectable, Logger } from '@nestjs/common';
import { OllamaEmbeddings } from '@langchain/ollama';
import { BookDocument, SearchHit } from '../../domain/model';
import { KnowledgeIndex } from '../../domain/ports';

/**
 * Adaptador del índice semántico:
 *  - Embeddings con LangChain + Ollama (nomic-embed-text por defecto).
 *  - Vectores en Qdrant (colección bibliotheca_books, distancia coseno) usando su API REST.
 * El id del punto en Qdrant es el id del libro, así que reindexar es idempotente.
 */
@Injectable()
export class QdrantKnowledgeIndex implements KnowledgeIndex {
  private readonly logger = new Logger(QdrantKnowledgeIndex.name);
  private readonly collection = process.env.QDRANT_COLLECTION ?? 'bibliotheca_books';
  private readonly baseUrl = (process.env.QDRANT_URL ?? 'http://localhost:6333').replace(/\/+$/, '');
  private readonly embeddings = new OllamaEmbeddings({
    model: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text',
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
  });
  // nomic-embed-text recomienda prefijos distintos para documentos y consultas.
  private readonly usesNomicPrefixes = (process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text').includes('nomic');
  private dimension: number | null = null;

  /** Cliente mínimo de la API REST de Qdrant. */
  private async qdrant<T = any>(method: string, path: string, body?: unknown): Promise<{ status: number; result: T }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json().catch(() => ({}))) as { result?: T; status?: unknown };
    if (!res.ok && res.status !== 404) {
      throw new Error(`Qdrant ${method} ${path} respondió ${res.status}: ${JSON.stringify(data.status ?? data).slice(0, 200)}`);
    }
    return { status: res.status, result: data.result as T };
  }

  private get path() {
    return `/collections/${encodeURIComponent(this.collection)}`;
  }

  private docText(doc: BookDocument) {
    return this.usesNomicPrefixes ? `search_document: ${doc.semanticText}` : doc.semanticText;
  }

  private queryText(query: string) {
    return this.usesNomicPrefixes ? `search_query: ${query}` : query;
  }

  private async collectionExists(): Promise<boolean> {
    const { status } = await this.qdrant('GET', this.path);
    return status === 200;
  }

  /** Crea la colección con la dimensión real del modelo de embeddings (y la recrea si cambió el modelo). */
  private async ensureCollection(dimension: number): Promise<void> {
    if (this.dimension === dimension) return;
    const { status, result } = await this.qdrant('GET', this.path);
    if (status === 200) {
      const currentSize = result?.config?.params?.vectors?.size ?? null;
      if (currentSize === dimension) {
        this.dimension = dimension;
        return;
      }
      this.logger.warn(`Dimensión cambió (${currentSize} → ${dimension}); recreando colección`);
      await this.qdrant('DELETE', this.path);
    }
    await this.qdrant('PUT', this.path, { vectors: { size: dimension, distance: 'Cosine' } });
    this.dimension = dimension;
    this.logger.log(`Colección ${this.collection} creada (dimensión ${dimension})`);
  }

  async upsert(documents: BookDocument[]): Promise<number> {
    if (documents.length === 0) return 0;
    const vectors = await this.embeddings.embedDocuments(documents.map((d) => this.docText(d)));
    await this.ensureCollection(vectors[0].length);
    await this.qdrant('PUT', `${this.path}/points?wait=true`, {
      points: documents.map((doc, i) => ({ id: doc.bookId, vector: vectors[i], payload: { ...doc } })),
    });
    return documents.length;
  }

  async search(query: string, limit: number): Promise<SearchHit[]> {
    if (!(await this.collectionExists())) return [];
    const vector = await this.embeddings.embedQuery(this.queryText(query));
    const { result } = await this.qdrant<{ points: Array<{ score?: number; payload?: Record<string, unknown> }> }>(
      'POST',
      `${this.path}/points/query`,
      { query: vector, limit, with_payload: true },
    );
    return (result?.points ?? [])
      .filter((p) => p.payload)
      .map((p) => ({ book: p.payload as unknown as BookDocument, score: p.score ?? 0 }));
  }

  async size(): Promise<number> {
    if (!(await this.collectionExists())) return 0;
    const { result } = await this.qdrant<{ count: number }>('POST', `${this.path}/points/count`, { exact: true });
    return result?.count ?? 0;
  }

  async reset(): Promise<void> {
    if (await this.collectionExists()) await this.qdrant('DELETE', this.path);
    this.dimension = null;
  }
}
