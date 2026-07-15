import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';

/**
 * Guards routes under `/tasks/:taskId/...`. Resolves the task, checks the user
 * is a member of the task's project (or a global ADMIN), and attaches
 * req.task + req.project for the handler. Requires JwtAuthGuard ahead of it.
 */
@Injectable()
export class TaskMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload;
    const taskId = req.params.taskId as string;

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (user.role !== UserRole.ADMIN) {
      const membership = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: task.projectId, userId: user.sub },
        },
        select: { userId: true },
      });
      if (!membership) {
        throw new ForbiddenException('You are not a member of this project');
      }
    }

    req.task = task;
    return true;
  }
}
