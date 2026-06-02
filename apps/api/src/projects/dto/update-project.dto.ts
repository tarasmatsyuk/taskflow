import { ProjectStatus } from '@prisma/client';
import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

// All fields optional — PATCH semantics. ownerId is intentionally not editable here.
export class UpdateProjectDto {
  @IsOptional()
  @Matches(/^[A-Z0-9]{2,10}$/, {
    message: 'key must be 2-10 uppercase letters or digits',
  })
  key?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
