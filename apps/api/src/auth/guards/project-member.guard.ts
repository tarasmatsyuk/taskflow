import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/jwt-payload';

/**
 * Only members of the project (or a global ADMIN) may touch it.
 * Resolves the project id from :projectId (nested task/member routes) or
 * :id (project routes). Requires JwtAuthGuard ahead of it (req.user set).
 * Attaches req.project and req.membership for downstream use.
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload;
    const projectId = (req.params.projectId ?? req.params.id) as string;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.sub } },
    });

    if (!membership && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Reuse downstream (e.g. role checks) and avoid refetching.
    req.project = project;
    req.membership = membership; // null when a global ADMIN isn't a member
    return true;
  }
}
