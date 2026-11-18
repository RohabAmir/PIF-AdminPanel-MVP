import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { SeoFieldsDto } from '../seo-fields.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export const SLUG_MSG = 'Slug may only contain lower-case letters, numbers and single dashes.';

export class CreatePageDto {
  @ApiProperty({ example: 'About us' })
  @Transform(trim)
  @IsString()
  @Length(1, 150, { message: 'Title is required (max 150 characters).' })
  title: string;

  @ApiPropertyOptional({ example: 'about-us' })
  @IsOptional()
  @Transform(trim)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: SLUG_MSG })
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID('4')
  parentId?: string | null;

  @ApiPropertyOptional({ type: SeoFieldsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoFieldsDto)
  seo?: SeoFieldsDto;
}

export class UpdatePageDto extends CreatePageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 150, { message: 'Title is required (max 150 characters).' })
  declare title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}

export class ListPagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PageStatus })
  @IsOptional()
  @IsEnum(PageStatus)
  status?: PageStatus;

  @ApiPropertyOptional({ enum: ['order', 'title', 'updatedAt', 'createdAt'] })
  @IsOptional()
  @IsIn(['order', 'title', 'updatedAt', 'createdAt'])
  sortBy: 'order' | 'title' | 'updatedAt' | 'createdAt' = 'order';
}

export class ReorderDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids: string[];
}
