import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { IssuedToken, PasswordHasher, TokenIssuer } from '../../domain/ports';
import { User } from '../../domain/user';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

/** Emite JWT (HS256) que el API Gateway valida en cada petición. */
@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  async issue(user: User): Promise<IssuedToken> {
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '8h';
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });
    return { accessToken, tokenType: 'Bearer', expiresIn };
  }
}
