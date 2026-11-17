import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Role } from '../../../shared/roles';
import { PASSWORD_HASHER, PasswordHasher, USER_REPOSITORY, UserRepository } from '../../domain/ports';
import { User } from '../../domain/user';

/**
 * Cuentas iniciales de la biblioteca. Los IDs son fijos porque préstamos y
 * notificaciones los referencian en sus propios datos iniciales.
 */
export const SEED_USERS: Array<{
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  studentId: string | null;
}> = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Roberto Salinas Cruz',
    email: 'direccion@bibliotheca.edu.mx',
    password: 'Dir#Bibl2026',
    role: 'ADMIN',
    studentId: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Laura Méndez Ortiz',
    email: 'laura.mendez@bibliotheca.edu.mx',
    password: 'Lmendez#2026',
    role: 'LIBRARIAN',
    studentId: 'EMP-0147',
  },
  {
    id: '33333333-3333-4333-8333-333333333331',
    name: 'Daniel Pérez',
    email: 'daniel.perez@bibliotheca.edu.mx',
    password: 'Dperez#2026',
    role: 'STUDENT',
    studentId: 'A00012345',
  },
  {
    id: '33333333-3333-4333-8333-333333333332',
    name: 'Ana Gómez',
    email: 'ana.gomez@bibliotheca.edu.mx',
    password: 'Agomez#2026',
    role: 'STUDENT',
    studentId: 'A00067890',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Mariana Ruiz Vela',
    email: 'mariana.ruiz@bibliotheca.edu.mx',
    password: 'Mruiz#2026',
    role: 'STUDENT',
    studentId: 'A00024680',
  },
];

@Injectable()
export class UsersSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_DATA === 'false' || (await this.users.count()) > 0) return;
    for (const seed of SEED_USERS) {
      const user = User.register(
        {
          id: seed.id,
          name: seed.name,
          email: seed.email,
          passwordHash: await this.hasher.hash(seed.password),
          role: seed.role,
          studentId: seed.studentId,
        },
        new Date(),
      );
      await this.users.save(user);
    }
    this.logger.log(`Cuentas iniciales creadas: ${SEED_USERS.length}`);
  }
}
