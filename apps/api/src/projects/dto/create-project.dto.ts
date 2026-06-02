import { ProjectStatus } from '@prisma/client';
import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateProjectDto {
  // Short human key used in task IDs (e.g. "TF" → TF-40). Unique across projects.
  @Matches(/^[A-Z0-9]{2,10}$/, {
    message: 'key must be 2-10 uppercase letters or digits',
  })
  key!: string;

  @IsString()
  @Length(2, 80)
  name!: string;

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

  // TODO(M2): drop this — owner will come from the authenticated user.
  @IsOptional()
  @IsString()
  ownerId?: string;
}
