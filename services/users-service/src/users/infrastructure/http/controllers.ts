import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, AuthUser, CurrentUser, Roles } from '../../../shared/auth';
import { LoginUseCase, RegisterUserUseCase } from '../../application/auth.use-cases';
import { ChangeUserRoleUseCase, GetUserUseCase, ListUsersUseCase } from '../../application/profile.use-cases';
import {
  CreateTelegramLinkCodeUseCase,
  FindUserByTelegramUseCase,
  LinkTelegramAccountUseCase,
  UnlinkTelegramUseCase,
} from '../../application/telegram.use-cases';
import { ChangeRoleDto, CreateStaffDto, LinkTelegramDto, ListUsersQuery, LoginDto, RegisterDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly register: RegisterUserUseCase,
    private readonly login: LoginUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registro de estudiantes (rol STUDENT)' })
  signUp(@Body() dto: RegisterDto) {
    return this.register.execute({ ...dto, role: 'STUDENT' });
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia sesión y devuelve un JWT' })
  signIn(@Body() dto: LoginDto) {
    return this.login.execute(dto);
  }
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly getUser: GetUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly changeRole: ChangeUserRoleUseCase,
    private readonly register: RegisterUserUseCase,
    private readonly createLinkCode: CreateTelegramLinkCodeUseCase,
    private readonly unlinkTelegram: UnlinkTelegramUseCase,
  ) {}

  @Get('me')
  @Authenticated()
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return this.getUser.execute(user.id);
  }

  @Post('me/telegram-link')
  @Authenticated()
  @ApiOperation({ summary: 'Genera un código para vincular la cuenta con el bot de Telegram' })
  telegramLink(@CurrentUser() user: AuthUser) {
    return this.createLinkCode.execute(user.id);
  }

  @Delete('me/telegram-link')
  @Authenticated()
  @ApiOperation({ summary: 'Desvincula Telegram' })
  telegramUnlink(@CurrentUser() user: AuthUser) {
    return this.unlinkTelegram.execute(user.id);
  }

  @Get()
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Lista usuarios (personal de biblioteca)' })
  list(@Query() query: ListUsersQuery) {
    return this.listUsers.execute(query);
  }

  @Get('by-student/:studentId')
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Busca un usuario por matrícula' })
  byStudent(@Param('studentId') studentId: string) {
    return this.getUser.byStudentId(studentId);
  }

  @Post('staff')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Alta de personal (bibliotecarios/administradores)' })
  createStaff(@Body() dto: CreateStaffDto) {
    return this.register.execute(dto);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cambia el rol de un usuario' })
  role(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.changeRole.execute(actor.id, id, dto.role);
  }
}

/** Endpoints internos: solo los consumen otros servicios, n8n y Node-RED (x-internal-key). */
@ApiTags('internal')
@Controller('internal/users')
export class InternalUsersController {
  constructor(
    private readonly getUser: GetUserUseCase,
    private readonly findByTelegram: FindUserByTelegramUseCase,
    private readonly linkTelegram: LinkTelegramAccountUseCase,
  ) {}

  @Get('by-telegram/:chatId')
  byTelegram(@Param('chatId') chatId: string) {
    return this.findByTelegram.execute(chatId);
  }

  @Post('telegram/link')
  @HttpCode(200)
  link(@Body() dto: LinkTelegramDto) {
    return this.linkTelegram.execute(dto);
  }

  @Get('by-student/:studentId')
  byStudent(@Param('studentId') studentId: string) {
    return this.getUser.byStudentId(studentId);
  }

  @Get(':id/contact')
  contact(@Param('id') id: string) {
    return this.getUser.contact(id);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.getUser.execute(id);
  }
}
