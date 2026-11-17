import { Availability, BookDocument, ChatTurn, SearchHit, SummaryLevel } from './model';

/** Índice semántico (embeddings + base vectorial). */
export const KNOWLEDGE_INDEX = Symbol('KNOWLEDGE_INDEX');
export interface KnowledgeIndex {
  upsert(documents: BookDocument[]): Promise<number>;
  search(query: string, limit: number): Promise<SearchHit[]>;
  size(): Promise<number>;
  reset(): Promise<void>;
}

/** Modelo de lenguaje con las tareas que necesita la biblioteca. */
export const LANGUAGE_MODEL = Symbol('LANGUAGE_MODEL');
export interface LanguageModel {
  answerWithCatalog(input: { question: string; history: ChatTurn[]; context: string }): Promise<string>;
  summarizeBook(input: { book: string; level: SummaryLevel }): Promise<string>;
  answerAboutBook(input: { book: string; question: string; history: ChatTurn[] }): Promise<string>;
  health(): Promise<{ ok: boolean; model: string; detail?: string }>;
}

/** Acceso al catálogo (catalog-service). */
export const CATALOG_SOURCE = Symbol('CATALOG_SOURCE');
export interface CatalogBook {
  id: string;
  title: string;
  authors: string[];
  category: string;
  tags: string[];
  year: number | null;
  language: string;
  synopsis: string;
  publisher: string | null;
  pages: number | null;
  semanticText: string;
  availability: { total: number; available: number; onLoan: number };
}
export interface CatalogSource {
  listBooks(): Promise<CatalogBook[]>;
  getBook(id: string): Promise<CatalogBook | null>;
  availability(ids: string[]): Promise<Record<string, Availability>>;
}
