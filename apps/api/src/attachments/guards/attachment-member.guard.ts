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
 * Guards routes under `/attachments/:id`. Resolves the attachment → task →
 * project, checks project membership (or ADMIN), and attaches req.attachment
 * (with its task) for the handler. Requires JwtAuthGuard ahead of it.
 */
@Injectable()
export class AttachmentMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload;
    const id = req.params.id as string;

    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: { task: { select: { id: true, projectId: true } } },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${id} not found`);
    }

    if (user.role !== UserRole.ADMIN) {
      const membership = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: attachment.task.projectId,
            userId: user.sub,
          },
        },
        select: { userId: true },
      });
      if (!membership) {
        throw new ForbiddenException('You are not a member of this project');
      }
    }

    req.attachment = attachment;
    return true;
  }
}
