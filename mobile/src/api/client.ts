/**
 * Cliente HTTP único hacia el API Gateway. Agrega el JWT y traduce errores a mensajes legibles.
 */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly details?: unknown) {
    super(message);
  }
}

export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

let baseUrl = DEFAULT_API_URL;
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const apiConfig = {
  setBaseUrl(url: string) {
    baseUrl = url.trim().replace(/\/+$/, '');
  },
  getBaseUrl() {
    return baseUrl;
  },
  setToken(value: string | null) {
    token = value;
  },
  setUnauthorizedHandler(handler: (() => void) | null) {
    onUnauthorized = handler;
  },
};

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function request<T>(method: Method, path: string, body?: unknown, timeoutMs = 20_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = (err as Error).name === 'AbortError';
    throw new ApiError(
      0,
      aborted
        ? 'El servidor tardó demasiado en responder.'
        : `No se pudo conectar con ${baseUrl}. Revisa que el celular y la computadora estén en la misma red.`,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (res.status === 401 && token && onUnauthorized) onUnauthorized();
  if (!res.ok) {
    const raw = data?.message ?? `Error ${res.status}`;
    throw new ApiError(res.status, Array.isArray(raw) ? raw.join('. ') : String(raw), data?.details);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado';
}
