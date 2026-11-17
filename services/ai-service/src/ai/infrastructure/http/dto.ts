import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { SUMMARY_LEVELS, SummaryLevel } from '../../domain/model';

export class ChatTurnDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @Length(1, 4000)
  content: string;
}

export class SearchDto {
  @ApiProperty({ example: 'Busco un libro que hable sobre física cuántica para principiantes' })
  @IsString()
  @Length(3, 500)
  query: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}

export class ChatDto {
  @ApiProperty({ example: 'Busco un libro que hable sobre física cuántica para principiantes' })
  @IsString()
  @Length(1, 1000)
  question: string;

  @ApiPropertyOptional({ type: [ChatTurnDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];
}

export class SummaryDto {
  @ApiPropertyOptional({ enum: SUMMARY_LEVELS, default: 'breve' })
  @IsOptional()
  @IsIn(SUMMARY_LEVELS as unknown as string[])
  level?: SummaryLevel;
}

export class ReindexDto {
  @ApiPropertyOptional({ default: false, description: 'Borra la colección antes de reindexar' })
  @IsOptional()
  @IsBoolean()
  reset?: boolean;
}
