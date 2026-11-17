import {
  applyDecorators,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { isRole, Role } from './roles';

export type { Role } from './roles';

/**
 * Seguridad entre servicios:
 *  - El API Gateway valida el JWT y reenvía la identidad en cabeceras x-user-*.
 *  - Toda petición interna debe traer x-internal-key (la agrega el Gateway, n8n o Node-RED).
 *  - Así ningún microservicio queda expuesto sin pasar por un componente de confianza.
 */
export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

const PUBLIC_KEY = 'bibliotheca:public';
const USER_REQUIRED_KEY = 'bibliotheca:user-required';
const ROLES_KEY = 'bibliotheca:roles';

/** Ruta sin ninguna verificación (health checks). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/** Requiere un usuario autenticado (cualquier rol). */
export const Authenticated = () => SetMetadata(USER_REQUIRED_KEY, true);

/** Requiere un usuario autenticado con alguno de los roles indicados. */
export const Roles = (...roles: Role[]) =>
  applyDecorators(SetMetadata(USER_REQUIRED_KEY, true), SetMetadata(ROLES_KEY, roles));

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function readUser(req: Request): AuthUser | null {
  const id = req.header('x-user-id');
  const role = req.header('x-user-role');
  if (!id || !isRole(role)) return null;
  return {
    id,
    role,
    name: decodeURIComponent(req.header('x-user-name') ?? ''),
    email: req.header('x-user-email') ?? '',
  };
}

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const expected = process.env.INTERNAL_API_KEY ?? 'dev-internal-key';
    if (!safeEqual(req.header('x-internal-key') ?? '', expected)) {
      throw new UnauthorizedException('Acceso permitido solo a través del API Gateway');
    }

    if (!this.reflector.getAllAndOverride<boolean>(USER_REQUIRED_KEY, targets)) return true;

    const user = readUser(req);
    if (!user) throw new UnauthorizedException('Sesión requerida');

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles && roles.length > 0 && !roles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}

/** Inyecta el usuario autenticado en el controlador. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const user = readUser(ctx.switchToHttp().getRequest<Request>());
  if (!user) throw new UnauthorizedException('Sesión requerida');
  return user;
});
