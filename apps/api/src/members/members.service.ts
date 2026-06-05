import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberRole, UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/types/jwt-payload';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

// Roles allowed to manage a project's membership.
const MANAGER_ROLES: MemberRole[] = [MemberRole.OWNER, MemberRole.ADMIN];

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  list(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async add(projectId: string, caller: JwtPayload, dto: AddMemberDto) {
    await this.assertManager(projectId, caller);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    return this.prisma.projectMember.create({
      data: { projectId, userId: dto.userId, role: dto.role ?? MemberRole.MEMBER },
    });
  }

  async updateRole(
    projectId: string,
    caller: JwtPayload,
    userId: string,
    dto: UpdateMemberDto,
  ) {
    await this.assertManager(projectId, caller);
    await this.getMembershipOr404(projectId, userId);
    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role: dto.role },
    });
  }

  async remove(projectId: string, caller: JwtPayload, userId: string) {
    await this.assertManager(projectId, caller);
    const membership = await this.getMembershipOr404(projectId, userId);
    if (membership.role === MemberRole.OWNER) {
      throw new ForbiddenException('Cannot remove the project owner');
    }
    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  private async getMembershipOr404(projectId: string, userId: string) {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    return membership;
  }

  /** Caller must be a global ADMIN or hold OWNER/ADMIN role in this project. */
  private async assertManager(projectId: string, caller: JwtPayload) {
    if (caller.role === UserRole.ADMIN) return;
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: caller.sub } },
    });
    if (!membership || !MANAGER_ROLES.includes(membership.role)) {
      throw new ForbiddenException(
        'Only the project owner or an admin can manage members',
      );
    }
  }
}
