import { ApiProperty } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';

/** Response shape for a Task (mirrors the Prisma model). */
export class TaskEntity {
  @ApiProperty({ example: 'cmq0t2amb00006jma06b8yr1t' })
  id!: string;

  @ApiProperty({ example: 40, description: 'Per-project number → "TF-40".' })
  number!: number;

  @ApiProperty({ example: 'Kanban board with dnd-kit' })
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority!: TaskPriority;

  @ApiProperty({ example: 1000, description: 'Position within its status column.' })
  order!: number;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  dueDate!: Date | null;

  @ApiProperty()
  projectId!: string;

  @ApiProperty({ nullable: true })
  assigneeId!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  deletedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
