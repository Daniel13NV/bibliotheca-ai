/**
 * Kernel compartido (sin dependencias de framework).
 * Roles de usuario reconocidos por todo el ecosistema.
 */
export const ROLES = ['STUDENT', 'LIBRARIAN', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: Role[] = ['LIBRARIAN', 'ADMIN'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}
