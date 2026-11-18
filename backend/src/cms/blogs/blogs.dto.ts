import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlogStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { SeoFieldsDto, URL_OR_UPLOAD } from '../seo-fields.dto';
import { SLUG_MSG } from '../pages/pages.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateBlogDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 200, { message: 'Title is required (max 200 characters).' })
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: SLUG_MSG })
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(400)
  excerpt?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_o, v) => v !== null)
  @Matches(URL_OR_UPLOAD, { message: 'Cover image must be a valid URL.' })
  coverImage?: string | null;

  @ApiPropertyOptional({ description: 'HTML from the rich-text editor (sanitised server-side)' })
  @IsOptional()
  @IsString()
  @MaxLength(300_000)
  content?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID('4')
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @Length(1, 30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: SeoFieldsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoFieldsDto)
  seo?: SeoFieldsDto;
}

export class UpdateBlogDto extends CreateBlogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200, { message: 'Title is required (max 200 characters).' })
  declare title: string;
}

export class PublishBlogDto {
  @ApiPropertyOptional({ description: 'Future date schedules the post; omit to publish now' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

export class ListBlogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BlogStatus })
  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['title', 'publishedAt', 'updatedAt', 'createdAt'] })
  @IsOptional()
  @IsIn(['title', 'publishedAt', 'updatedAt', 'createdAt'])
  sortBy: 'title' | 'publishedAt' | 'updatedAt' | 'createdAt' = 'updatedAt';
}

export class CategoryDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(1, 60, { message: 'Category name is required (max 60 characters).' })
  name: string;
}
