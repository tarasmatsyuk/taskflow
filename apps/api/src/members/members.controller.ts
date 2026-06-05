import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectMemberGuard } from '../auth/guards/project-member.guard';
import { JwtPayload } from '../auth/types/jwt-payload';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

// Must be a member to view; manage actions additionally require OWNER/ADMIN
// (enforced in the service).
@ApiTags('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectMemberGuard)
@Controller('projects/:projectId/members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @ApiOperation({ summary: 'List members of a project' })
  list(@Param('projectId') projectId: string) {
    return this.members.list(projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a member (owner/admin only)' })
  add(
    @Param('projectId') projectId: string,
    @CurrentUser() caller: JwtPayload,
    @Body() dto: AddMemberDto,
  ) {
    return this.members.add(projectId, caller, dto);
  }

  @Patch(':userId')
  @ApiOperation({ summary: "Change a member's role (owner/admin only)" })
  updateRole(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser() caller: JwtPayload,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.members.updateRole(projectId, caller, userId, dto);
  }

  @Delete(':userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a member (owner/admin only)' })
  remove(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser() caller: JwtPayload,
  ) {
    return this.members.remove(projectId, caller, userId);
  }
}
