import { Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../../shared/domain-error';
import { isRole } from '../../../shared/roles';
import { Borrower, CatalogGateway, CopyInfo, UserDirectory } from '../../domain/ports';

const internalHeaders = () => ({
  'x-internal-key': process.env.INTERNAL_API_KEY ?? 'dev-internal-key',
  'content-type': 'application/json',
});

async function getJson<T>(url: string, service: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(url, { headers: internalHeaders(), signal: AbortSignal.timeout(5000) });
  } catch (err) {
    throw DomainError.unavailable(`${service} no responde (${(err as Error).message})`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw DomainError.unavailable(`${service} respondió ${res.status}`);
  return (await res.json()) as T;
}

/** Adaptador hacia catalog-service (consulta síncrona del ejemplar). */
@Injectable()
export class HttpCatalogGateway implements CatalogGateway {
  private readonly baseUrl = process.env.CATALOG_URL ?? 'http://localhost:3002';

  async lookupCopy(ref: string): Promise<CopyInfo | null> {
    const data = await getJson<{
      copy: { id: string; code: string; rfidEpc: string | null; status: string; location: string; bookId: string };
      book: { id: string; title: string };
    }>(`${this.baseUrl}/internal/copies/lookup?ref=${encodeURIComponent(ref)}`, 'El catálogo');
    if (!data) return null;
    return {
      copyId: data.copy.id,
      code: data.copy.code,
      rfidEpc: data.copy.rfidEpc,
      status: data.copy.status,
      location: data.copy.location,
      bookId: data.book.id,
      bookTitle: data.book.title,
    };
  }
}

/** Adaptador hacia users-service. */
@Injectable()
export class HttpUserDirectory implements UserDirectory {
  private readonly logger = new Logger(HttpUserDirectory.name);
  private readonly baseUrl = process.env.USERS_URL ?? 'http://localhost:3001';

  async findByStudentId(studentId: string): Promise<Borrower | null> {
    const data = await getJson<{ id: string; name: string; role: string; studentId: string | null }>(
      `${this.baseUrl}/internal/users/by-student/${encodeURIComponent(studentId)}`,
      'El servicio de usuarios',
    );
    if (!data) return null;
    if (!isRole(data.role)) {
      this.logger.warn(`Rol desconocido para ${studentId}: ${data.role}`);
      return null;
    }
    return { id: data.id, name: data.name, role: data.role, studentId: data.studentId };
  }
}
