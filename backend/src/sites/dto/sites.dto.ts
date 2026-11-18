import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value;

export class CreateSiteDto {
  @ApiProperty({ example: 'Oasis Demo' })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiPropertyOptional({
    example: 'oasis-demo',
    description: 'Auto-generated from the name if omitted',
  })
  @IsOptional()
  @Transform(trim)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug may only contain lower-case letters, numbers and dashes.',
  })
  @MaxLength(60)
  slug?: string;

  @ApiPropertyOptional({ example: 'oasis-demo.example.com' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null)
  @Matches(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i, {
    message: 'Enter a valid domain like example.com',
  })
  @MaxLength(253)
  domain?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null && !(typeof v === 'string' && v.startsWith('/uploads/')))
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'Logo must be a valid URL.' },
  )
  logoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_o, v) => v !== null && !(typeof v === 'string' && v.startsWith('/uploads/')))
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'Favicon must be a valid URL.' },
  )
  faviconUrl?: string | null;

  @ApiPropertyOptional({ example: '#4A4A89' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Primary colour must be a hex value like #4A4A89.' })
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, { message: 'Use a language code such as en or ar.' })
  defaultLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSiteDto extends PartialType(CreateSiteDto) {}

export class ListSitesQueryDto extends PaginationQueryDto {}
