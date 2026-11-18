import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { FIELD_TYPES, FieldType } from './form-fields';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class FormFieldDto {
  @ApiProperty({ example: 'email' })
  @Matches(/^[a-z][a-z0-9_]{0,39}$/, { message: 'Field key must start with a letter and use lower-case letters, numbers or underscores.' })
  name: string;

  @ApiProperty({ example: 'Email address' })
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  label: string;

  @ApiProperty({ enum: FIELD_TYPES })
  @IsIn(FIELD_TYPES)
  type: FieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeholder?: string;

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  minLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Regular expression the whole value must match' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pattern?: string;
}

export class CreateFormDto {
  @ApiProperty({ example: 'Contact us' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 'contact' })
  @Transform(trim)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Form key may only contain lower-case letters, numbers and dashes.' })
  @MaxLength(60)
  key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ type: [FormFieldDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one field.' })
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 300)
  successMessage?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : typeof value === 'string' ? value.trim().toLowerCase() : value))
  @ValidateIf((_o, v) => v !== null)
  @IsEmail({}, { message: 'Notification email must be a valid email address.' })
  notificationEmail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFormDto extends CreateFormDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  declare name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Form key may only contain lower-case letters, numbers and dashes.' })
  @MaxLength(60)
  declare key: string;

  @ApiPropertyOptional({ type: [FormFieldDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one field.' })
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  declare fields: FormFieldDto[];
}
