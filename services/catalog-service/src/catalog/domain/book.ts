import { DomainError } from '../../shared/domain-error';

export interface BookProps {
  id: string;
  isbn: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  year: number | null;
  category: string;
  language: string;
  synopsis: string;
  coverUrl: string | null;
  pages: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type BookInput = Omit<BookProps, 'id' | 'createdAt' | 'updatedAt'>;

function clean(list: string[]): string[] {
  return [...new Set(list.map((v) => v.trim()).filter(Boolean))];
}

function normalizeIsbn(isbn: string | null | undefined): string | null {
  if (!isbn) return null;
  const value = isbn.replace(/[-\s]/g, '').toUpperCase();
  if (!/^(\d{9}[\dX]|\d{13})$/.test(value)) throw DomainError.validation('ISBN inválido (10 o 13 dígitos)');
  return value;
}

/** Registro bibliográfico (la "obra"); los ejemplares físicos son Copy. */
export class Book {
  private constructor(private props: BookProps) {}

  static create(id: string, input: BookInput, now: Date): Book {
    const book = new Book({ ...input, id, createdAt: now, updatedAt: now });
    book.validateAndNormalize();
    return book;
  }

  static restore(props: BookProps): Book {
    return new Book({ ...props });
  }

  get id() { return this.props.id; }
  get title() { return this.props.title; }
  get authors() { return this.props.authors; }
  get category() { return this.props.category; }

  update(changes: Partial<BookInput>, now: Date): void {
    this.props = { ...this.props, ...changes, updatedAt: now };
    this.validateAndNormalize();
  }

  private validateAndNormalize(): void {
    const p = this.props;
    p.title = p.title?.trim();
    p.category = p.category?.trim();
    p.synopsis = p.synopsis?.trim() ?? '';
    p.authors = clean(p.authors ?? []);
    p.tags = clean((p.tags ?? []).map((t) => t.toLowerCase()));
    p.isbn = normalizeIsbn(p.isbn);
    p.language = p.language?.trim() || 'Español';
    if (!p.title || p.title.length < 2) throw DomainError.validation('El título es obligatorio');
    if (p.authors.length === 0) throw DomainError.validation('Debe tener al menos un autor');
    if (!p.category) throw DomainError.validation('La categoría es obligatoria');
    if (p.year !== null && p.year !== undefined && (p.year < 1000 || p.year > new Date().getFullYear() + 1)) {
      throw DomainError.validation('Año de publicación inválido');
    }
  }

  /** Texto que describe la obra; lo usa el servicio de IA para generar embeddings. */
  semanticText(): string {
    const p = this.props;
    return [
      `Título: ${p.title}`,
      `Autores: ${p.authors.join(', ')}`,
      `Categoría: ${p.category}`,
      p.tags.length ? `Temas: ${p.tags.join(', ')}` : '',
      `Sinopsis: ${p.synopsis}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  snapshot(): BookProps {
    return { ...this.props, authors: [...this.props.authors], tags: [...this.props.tags] };
  }
}
