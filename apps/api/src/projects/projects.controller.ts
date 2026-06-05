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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectMemberGuard } from '../auth/guards/project-member.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginatedProjects, ProjectEntity } from './entities/project.entity';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a project (owned by the current user)' })
  @ApiCreatedResponse({ type: ProjectEntity })
  create(@CurrentUser('sub') ownerId: string, @Body() dto: CreateProjectDto) {
    return this.projects.create(dto, ownerId);
  }

  @Get()
  @ApiOperation({ summary: 'List projects (paginated, filterable, sortable)' })
  @ApiOkResponse({ type: PaginatedProjects })
  findAll(@Query() query: QueryProjectsDto) {
    return this.projects.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findOne(@Param('id') id: string) {
    return this.projects.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ProjectMemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a project (owner/admin only)' })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiNotFoundResponse({ description: 'Project not found' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ProjectMemberGuard)
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a project (owner/admin only)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  remove(@Param('id') id: string) {
    return this.projects.remove(id);
  }
}
