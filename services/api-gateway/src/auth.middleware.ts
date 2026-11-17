import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import { GUEST_ROUTES, PUBLIC_ROUTES, SERVICE_ROUTES } from './routes';

interface JwtPayload {
  sub: string;
  role: string;
  name: string;
  email: string;
}

const IDENTITY_HEADERS = ['x-user-id', 'x-user-role', 'x-user-name', 'x-user-email', 'x-internal-key'];

/**
 * 1. Elimina cualquier cabecera de identidad enviada por el cliente (evita suplantación).
 * 2. Valida el JWT, salvo en rutas públicas (login/registro) y de invitado (explorar catálogo).
 * 3. Propaga la identidad y la llave interna hacia el microservicio.
 */
export function authMiddleware(jwt: JwtService) {
  const internalKey = process.env.INTERNAL_API_KEY ?? 'dev-internal-key';
  const proxied = SERVICE_ROUTES.flatMap((r) => r.prefixes);

  const verify = (req: Request): JwtPayload | null => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    try {
      return jwt.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  };

  const attachIdentity = (req: Request, payload: JwtPayload) => {
    req.headers['x-user-id'] = payload.sub;
    req.headers['x-user-role'] = payload.role;
    req.headers['x-user-name'] = encodeURIComponent(payload.name ?? '');
    req.headers['x-user-email'] = payload.email ?? '';
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    if (!proxied.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return next();
    if (req.method === 'OPTIONS') return next();

    for (const header of IDENTITY_HEADERS) delete req.headers[header];
    req.headers['x-internal-key'] = internalKey;

    if (PUBLIC_ROUTES.some((r) => r.method === req.method && r.path === path)) return next();

    const payload = verify(req);

    if (GUEST_ROUTES.some((r) => r.method === req.method && r.pattern.test(path))) {
      if (payload) attachIdentity(req, payload);
      return next();
    }

    if (!req.headers.authorization) {
      res.status(401).json({ statusCode: 401, message: 'Inicia sesión para continuar' });
      return;
    }
    if (!payload) {
      res.status(401).json({ statusCode: 401, message: 'Tu sesión expiró, vuelve a iniciar sesión' });
      return;
    }
    attachIdentity(req, payload);
    next();
  };
}
