import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectMemberGuard } from '../auth/guards/project-member.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';

// All task routes are members-only: must be logged in AND a member of :projectId.
@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectMemberGuard)
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task in a project' })
  @ApiCreatedResponse({ type: TaskEntity })
  create(@Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
    return this.tasks.create(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks in a project (optionally filtered)' })
  @ApiOkResponse({ type: [TaskEntity] })
  findAll(
    @Param('projectId') projectId: string,
    @Query() query: QueryTasksDto,
  ) {
    return this.tasks.findAll(projectId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by id' })
  @ApiOkResponse({ type: TaskEntity })
  @ApiNotFoundResponse({ description: 'Task not found' })
  findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.tasks.findOne(projectId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiOkResponse({ type: TaskEntity })
  @ApiNotFoundResponse({ description: 'Task not found' })
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(projectId, id, dto);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move/reorder a task (column + position, atomic)' })
  @ApiOkResponse({ type: TaskEntity })
  @ApiNotFoundResponse({ description: 'Task not found' })
  move(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasks.move(projectId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a task (sets deletedAt)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.tasks.remove(projectId, id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted task' })
  @ApiOkResponse({ type: TaskEntity })
  @ApiNotFoundResponse({ description: 'Task not found' })
  restore(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.tasks.restore(projectId, id);
  }
}
