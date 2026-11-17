import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ example: 'BIB-00101', description: 'Código QR, UID RFID/NFC o id del ejemplar' })
  @IsString()
  @Length(3, 64)
  copyRef: string;

  @ApiPropertyOptional({
    example: 'A00067890',
    description: 'Solo personal: matrícula del estudiante al que se presta',
  })
  @IsOptional()
  @IsString()
  studentId?: string;
}

export class ReturnDto {
  @ApiProperty({ example: 'BIB-00301' })
  @IsString()
  @Length(3, 64)
  copyRef: string;
}

export class MyLoansQuery {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ obj, key }) => obj[key] === true || obj[key] === 'true')
  @IsBoolean()
  history?: boolean;
}

export class ListLoansQuery {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'OVERDUE', 'RETURNED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'OVERDUE', 'RETURNED'])
  status?: 'ACTIVE' | 'OVERDUE' | 'RETURNED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class PenaltiesQuery {
  @ApiPropertyOptional({ enum: ['PENDING', 'PAID', 'WAIVED'] })
  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'WAIVED'])
  status?: 'PENDING' | 'PAID' | 'WAIVED';
}

export class WaiveDto {
  @ApiProperty({ example: 'Justificante médico' })
  @IsString()
  @Length(3, 300)
  reason: string;
}

export class RemindersDto {
  @ApiPropertyOptional({ default: 2, description: 'Avisar préstamos que vencen en N días o menos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(14)
  daysAhead?: number;
}

/** Usado por n8n: el bot actúa en nombre del usuario vinculado a un chat de Telegram. */
export class BotRenewDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}
