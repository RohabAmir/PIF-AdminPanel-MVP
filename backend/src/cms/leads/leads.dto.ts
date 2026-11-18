import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class LeadFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  formId?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'name', 'status'] })
  @IsOptional()
  @IsIn(['createdAt', 'name', 'status'])
  sortBy: 'createdAt' | 'name' | 'status' = 'createdAt';
}

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status: LeadStatus;
}

export class AddLeadNoteDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 2000, { message: 'Note must be between 1 and 2000 characters.' })
  body: string;
}
