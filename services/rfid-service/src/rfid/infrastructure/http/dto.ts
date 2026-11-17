import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { READER_TYPES, ReaderType } from '../../domain/reader';

export class RawReadDto {
  @ApiProperty({ example: 'E0040150000000C9' })
  @IsString()
  epc: string;

  @ApiPropertyOptional({ example: -52 })
  @IsOptional()
  @IsNumber()
  rssi?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  antenna?: number;

  @ApiPropertyOptional({ example: '2026-11-05T15:30:00.000Z' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class IngestDto {
  @ApiProperty({ example: 'GATE-01' })
  @IsString()
  readerId: string;

  @ApiProperty({ type: [RawReadDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => RawReadDto)
  reads: RawReadDto[];
}

export class SimulateDto {
  @ApiProperty({ example: 'GATE-01' })
  @IsString()
  readerId: string;

  @ApiProperty({ example: 'E00401500000012D' })
  @IsString()
  epc: string;
}

export class CreateReaderDto {
  @ApiProperty({ example: 'SHELF-E' })
  @IsString()
  @Length(3, 40)
  id: string;

  @ApiProperty({ example: 'Estante inteligente E · Hemeroteca' })
  @IsString()
  name: string;

  @ApiProperty({ enum: READER_TYPES })
  @IsIn(READER_TYPES as unknown as string[])
  type: ReaderType;

  @ApiProperty({ example: 'Hemeroteca' })
  @IsString()
  zone: string;

  @ApiProperty({ example: 'Planta alta, pasillo 5' })
  @IsString()
  location: string;
}

export class UpdateReaderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ enum: READER_TYPES })
  @IsOptional()
  @IsIn(READER_TYPES as unknown as string[])
  type?: ReaderType;
}

export class RecentQuery {
  @ApiPropertyOptional({ example: 'GATE-01' })
  @IsOptional()
  @IsString()
  readerId?: string;

  @ApiPropertyOptional({ example: 'E00401500000012D' })
  @IsOptional()
  @IsString()
  epc?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
