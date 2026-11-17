import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { COPY_STATUSES, CopyStatus } from '../../domain/copy';

export class SearchBooksQuery {
  @ApiPropertyOptional({ example: 'física cuántica', description: 'Título, autor, tema o ISBN' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Física' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ obj, key }) => obj[key] === true || obj[key] === 'true')
  @IsBoolean()
  availableOnly?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class CreateBookDto {
  @ApiProperty({ example: 'Siete breves lecciones de física' })
  @IsString()
  @Length(2, 255)
  title: string;

  @ApiProperty({ example: ['Carlo Rovelli'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  authors: string[];

  @ApiPropertyOptional({ example: '9788433963871' })
  @IsOptional()
  @IsString()
  isbn?: string;

  @ApiPropertyOptional({ example: 'Anagrama' })
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiPropertyOptional({ example: 2014 })
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiProperty({ example: 'Física' })
  @IsString()
  @Length(2, 80)
  category: string;

  @ApiPropertyOptional({ example: 'Español' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: 'Siete capítulos que introducen la física moderna sin matemáticas…' })
  @IsString()
  @Length(10, 5000)
  synopsis: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 96 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pages?: number;

  @ApiPropertyOptional({ example: ['física cuántica', 'principiantes'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 2, description: 'Ejemplares a dar de alta al crear el libro' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  initialCopies?: number;

  @ApiPropertyOptional({ example: 'Ciencias' })
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiPropertyOptional({ example: 'A1' })
  @IsOptional()
  @IsString()
  shelf?: string;
}

export class UpdateBookDto extends PartialType(CreateBookDto) {}

export class AddCopyDto {
  @ApiProperty({ example: 'Ciencias' })
  @IsString()
  zone: string;

  @ApiProperty({ example: 'A1' })
  @IsString()
  shelf: string;

  @ApiPropertyOptional({ example: 'E004015000000999' })
  @IsOptional()
  @IsString()
  rfidEpc?: string;
}

export class AssignTagDto {
  @ApiProperty({ example: 'E004015000000999', description: 'UID/EPC leído por NFC o lector RFID' })
  @IsString()
  epc: string;
}

export class ChangeStatusDto {
  @ApiProperty({ enum: COPY_STATUSES })
  @IsIn(COPY_STATUSES as unknown as string[])
  status: CopyStatus;
}

export class RelocateDto {
  @ApiProperty({ example: 'Ciencias' })
  @IsString()
  zone: string;

  @ApiProperty({ example: 'A2' })
  @IsString()
  shelf: string;
}

export class LookupQuery {
  @ApiProperty({ example: 'BIB-00301', description: 'Código QR, UID RFID o id del ejemplar' })
  @IsString()
  ref: string;
}

export class AvailabilityDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids: string[];
}

export class ResolveAlertDto {
  @ApiPropertyOptional({ example: 'El usuario regresó el libro al mostrador' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AlertsQuery {
  @ApiPropertyOptional({ enum: ['OPEN', 'RESOLVED'] })
  @IsOptional()
  @IsIn(['OPEN', 'RESOLVED'])
  status?: 'OPEN' | 'RESOLVED';
}

export class InventoryQuery {
  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  hours?: number;
}
