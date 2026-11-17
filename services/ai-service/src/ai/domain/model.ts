/**
 * Modelo del contexto de IA. No conoce LangChain, Qdrant ni Ollama:
 * solo describe qué es un documento indexable, un resultado y una conversación.
 */
export interface BookDocument {
  bookId: string;
  title: string;
  authors: string[];
  category: string;
  tags: string[];
  year: number | null;
  language: string;
  synopsis: string;
  semanticText: string;
}

export interface SearchHit {
  book: BookDocument;
  score: number;
}

export interface Availability {
  total: number;
  available: number;
  onLoan: number;
  locations: string[];
}

export interface RecommendedBook {
  bookId: string;
  title: string;
  authors: string[];
  category: string;
  score: number;
  availability: Availability | null;
}

export type ChatRole = 'user' | 'assistant';
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export const SUMMARY_LEVELS = ['breve', 'detallado', 'principiante'] as const;
export type SummaryLevel = (typeof SUMMARY_LEVELS)[number];

/** Umbral mínimo de similitud coseno para considerar relevante un libro. */
export const MIN_RELEVANCE = 0.35;

/** Texto de contexto que se entrega al LLM: incluye disponibilidad real para no inventarla. */
export function describeForContext(index: number, book: RecommendedBook, doc: BookDocument): string {
  const availability = book.availability
    ? `${book.availability.available} de ${book.availability.total} ejemplares disponibles` +
      (book.availability.locations.length ? ` · Ubicación: ${book.availability.locations.join('; ')}` : '')
    : 'disponibilidad desconocida';
  return [
    `[${index}] ${doc.title} — ${doc.authors.join(', ')}${doc.year ? ` (${doc.year})` : ''}`,
    `Categoría: ${doc.category}. Idioma: ${doc.language}. Temas: ${doc.tags.join(', ') || 'n/d'}.`,
    `Disponibilidad: ${availability}.`,
    `Sinopsis: ${shorten(doc.synopsis, 320)}`,
  ].join('\n');
}

/** Recorta textos largos: menos tokens de entrada = respuestas más rápidas en CPU. */
export function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`;
}

export function toDocument(book: {
  id: string;
  title: string;
  authors: string[];
  category: string;
  tags?: string[];
  year?: number | null;
  language?: string;
  synopsis: string;
  semanticText?: string;
}): BookDocument {
  return {
    bookId: book.id,
    title: book.title,
    authors: book.authors ?? [],
    category: book.category,
    tags: book.tags ?? [],
    year: book.year ?? null,
    language: book.language ?? 'Español',
    synopsis: book.synopsis,
    semanticText:
      book.semanticText ??
      `Título: ${book.title}\nAutores: ${(book.authors ?? []).join(', ')}\nCategoría: ${book.category}\nSinopsis: ${book.synopsis}`,
  };
}
