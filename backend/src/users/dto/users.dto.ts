import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export const ASSIGNABLE_ROLES = [Role.ADMIN, Role.EDITOR, Role.VIEWER] as const;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateUserDto {
  @ApiProperty({ example: 'Nadia Rahman' })
  @Transform(trim)
  @IsString()
  @Length(2, 80, { message: 'Name must be between 2 and 80 characters.' })
  name: string;

  @ApiProperty({ example: 'nadia@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES, { message: 'Role must be Admin, Editor or Viewer.' })
  role: Role;

  @ApiProperty({ type: [String], description: 'Website ids (at least one)' })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  siteIds: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  name?: string;

  @ApiPropertyOptional({ enum: ASSIGNABLE_ROLES })
  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES, { message: 'Role must be Admin, Editor or Viewer.' })
  role?: Role;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  siteIds?: string[];
}

export class SetStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'INACTIVE'])
  status: 'ACTIVE' | 'INACTIVE';
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  siteId?: string;

  @ApiPropertyOptional({ enum: ['name', 'email', 'createdAt', 'lastLoginAt', 'role'] })
  @IsOptional()
  @IsIn(['name', 'email', 'createdAt', 'lastLoginAt', 'role'])
  sortBy: 'name' | 'email' | 'createdAt' | 'lastLoginAt' | 'role' = 'createdAt';
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  name?: string;

  @ApiPropertyOptional({ example: '#4A4A89' })
  @IsOptional()
  @IsString()
  @Transform(trim)
  @Length(7, 7)
  avatarColor?: string;
}
