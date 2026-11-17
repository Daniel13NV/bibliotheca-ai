/**
 * Error de dominio independiente del framework.
 * La capa HTTP lo traduce a códigos de estado (ver exception.filter.ts).
 */
export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RULE_VIOLATION'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'UNAVAILABLE';

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }

  static notFound(what: string): DomainError {
    return new DomainError('NOT_FOUND', `${what} no encontrado`);
  }

  static conflict(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('CONFLICT', message, details);
  }

  static rule(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('RULE_VIOLATION', message, details);
  }

  static validation(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError('VALIDATION', message, details);
  }

  static unauthorized(message = 'Credenciales inválidas'): DomainError {
    return new DomainError('UNAUTHORIZED', message);
  }

  static forbidden(message = 'No tienes permisos para esta acción'): DomainError {
    return new DomainError('FORBIDDEN', message);
  }

  static unavailable(message: string): DomainError {
    return new DomainError('UNAVAILABLE', message);
  }
}
