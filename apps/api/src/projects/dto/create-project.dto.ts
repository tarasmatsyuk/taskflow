import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Short unique key used in task IDs (e.g. "TF" → TF-40).',
    example: 'TF',
    pattern: '^[A-Z0-9]{2,10}$',
  })
  @Matches(/^[A-Z0-9]{2,10}$/, {
    message: 'key must be 2-10 uppercase letters or digits',
  })
  key!: string;

  @ApiProperty({ example: 'TaskFlow', minLength: 2, maxLength: 80 })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiPropertyOptional({ example: 'The full-stack board app.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ example: '#c2f24f', description: 'Hex color.' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  // Owner is taken from the authenticated user (M2), not the request body.
}
