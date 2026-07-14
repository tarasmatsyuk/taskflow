import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryTasksDto {
  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filter by column.' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Filter by assignee user id.' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Filter to tasks carrying this label id.' })
  @IsOptional()
  @IsString()
  labelId?: string;
}
