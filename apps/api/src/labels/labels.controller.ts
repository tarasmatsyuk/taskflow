import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectMemberGuard } from '../auth/guards/project-member.guard';
import { CreateLabelDto } from './dto/create-label.dto';
import { LabelsService } from './labels.service';

@ApiTags('labels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectMemberGuard)
@Controller('projects/:projectId/labels')
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Get()
  @ApiOperation({ summary: "List a project's labels" })
  list(@Param('projectId') projectId: string) {
    return this.labels.list(projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a label' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateLabelDto) {
    return this.labels.create(projectId, dto);
  }

  @Delete(':labelId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a label' })
  remove(
    @Param('projectId') projectId: string,
    @Param('labelId') labelId: string,
  ) {
    return this.labels.remove(projectId, labelId);
  }
}
