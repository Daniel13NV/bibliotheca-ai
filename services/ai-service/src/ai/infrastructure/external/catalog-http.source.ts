import { Injectable } from '@nestjs/common';
import { Availability } from '../../domain/model';
import { CatalogBook, CatalogSource } from '../../domain/ports';

@Injectable()
export class HttpCatalogSource implements CatalogSource {
  private readonly baseUrl = process.env.CATALOG_URL ?? 'http://localhost:3002';

  private async request<T>(path: string, init?: RequestInit): Promise<T | null> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY ?? 'dev-internal-key',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`catalog-service respondió ${res.status}`);
    return (await res.json()) as T;
  }

  async listBooks() {
    return (await this.request<CatalogBook[]>('/internal/books')) ?? [];
  }

  getBook(id: string) {
    return this.request<CatalogBook>(`/internal/books/${encodeURIComponent(id)}`);
  }

  async availability(ids: string[]) {
    return (
      (await this.request<Record<string, Availability>>('/internal/books/availability', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })) ?? {}
    );
  }
}
