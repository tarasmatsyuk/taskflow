import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class MoveTaskDto {
  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'Target column. Omit to reorder within the current column.',
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    minimum: 0,
    description: '0-based index within the target column (among siblings).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position!: number;
}
