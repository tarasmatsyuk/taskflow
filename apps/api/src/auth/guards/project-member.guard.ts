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
 * M2: only the project owner (or an ADMIN) may mutate a project.
 * M3 will broaden "owner" to "member" once ProjectMember exists.
 * Expects a route param :id and a JwtAuthGuard ahead of it (req.user set).
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload;
    const projectId = req.params.id as string;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    if (project.ownerId !== user.sub && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Reuse downstream to avoid a second fetch.
    req.project = project;
    return true;
  }
}
