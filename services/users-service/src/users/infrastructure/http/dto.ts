import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';
import { ROLES, Role } from '../../../shared/roles';

export class RegisterDto {
  @ApiProperty({ example: 'Daniel Pérez' })
  @IsString()
  @Length(3, 120)
  name: string;

  @ApiProperty({ example: 'nombre@bibliotheca.edu.mx' })
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @ApiProperty({ example: 'MiClave123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiPropertyOptional({ example: 'A00012345', description: 'Matrícula escolar' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{4,30}$/, { message: 'Matrícula inválida' })
  studentId?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'daniel.perez@bibliotheca.edu.mx' })
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @ApiProperty({ example: 'Dperez#2026' })
  @IsString()
  password: string;
}

export class CreateStaffDto extends RegisterDto {
  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES as unknown as string[])
  role: Role;
}

export class ChangeRoleDto {
  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES as unknown as string[])
  role: Role;
}

export class LinkTelegramDto {
  @ApiProperty({ example: '482913' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  chatId: string;

  @ApiPropertyOptional({ example: 'daniel_lector' })
  @IsOptional()
  @IsString()
  username?: string;
}

export class ListUsersQuery {
  @ApiPropertyOptional({ enum: ROLES })
  @IsOptional()
  @IsIn(ROLES as unknown as string[])
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
