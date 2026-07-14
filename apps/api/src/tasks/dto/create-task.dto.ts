import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement board drag-and-drop' })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.BACKLOG })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2026-06-30T00:00:00.000Z', format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'User id to assign the task to' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Label ids to attach' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];

  // number + order are server-assigned, not accepted from the client.
}
