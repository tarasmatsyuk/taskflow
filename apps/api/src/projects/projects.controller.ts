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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a project' })
  @ApiCreatedResponse({ type: ProjectEntity })
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
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
  @ApiOperation({ summary: 'Update a project' })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiNotFoundResponse({ description: 'Project not found' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  remove(@Param('id') id: string) {
    return this.projects.remove(id);
  }
}
