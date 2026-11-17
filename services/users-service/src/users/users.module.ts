import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginUseCase, RegisterUserUseCase } from './application/auth.use-cases';
import { ChangeUserRoleUseCase, GetUserUseCase, ListUsersUseCase } from './application/profile.use-cases';
import {
  CreateTelegramLinkCodeUseCase,
  FindUserByTelegramUseCase,
  LinkTelegramAccountUseCase,
  UnlinkTelegramUseCase,
} from './application/telegram.use-cases';
import { PASSWORD_HASHER, TOKEN_ISSUER, USER_REPOSITORY } from './domain/ports';
import { AuthController, InternalUsersController, UsersController } from './infrastructure/http/controllers';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { BcryptPasswordHasher, JwtTokenIssuer } from './infrastructure/security/adapters';
import { UsersSeeder } from './infrastructure/seed/users.seeder';

/** Composition root del contexto: aquí se conectan puertos con adaptadores. */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as never },
    }),
  ],
  controllers: [AuthController, UsersController, InternalUsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    RegisterUserUseCase,
    LoginUseCase,
    GetUserUseCase,
    ListUsersUseCase,
    ChangeUserRoleUseCase,
    CreateTelegramLinkCodeUseCase,
    LinkTelegramAccountUseCase,
    UnlinkTelegramUseCase,
    FindUserByTelegramUseCase,
    UsersSeeder,
  ],
})
export class UsersModule {}
