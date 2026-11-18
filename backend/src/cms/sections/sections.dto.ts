import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateSectionDto {
  @ApiProperty({ enum: SectionType })
  @IsEnum(SectionType)
  type: SectionType;

  @ApiPropertyOptional({ example: 'Homepage hero' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Block content; validated against the schema of its type' })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class UpdateSectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
