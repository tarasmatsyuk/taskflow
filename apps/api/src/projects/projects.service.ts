import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    const ownerId = dto.ownerId ?? (await this.defaultOwnerId());
    return this.prisma.project.create({ data: { ...dto, ownerId } });
  }

  async findAll(query: QueryProjectsDto) {
    const { page, limit, status, search, sortBy, sortOrder } = query;

    const where: Prisma.ProjectWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { key: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id); // 404 if missing
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id); // 404 if missing
    await this.prisma.project.delete({ where: { id } });
  }

  // TODO(M2): replace with the authenticated user via @CurrentUser().
  private async defaultOwnerId() {
    const user = await this.prisma.user.findFirst();
    if (!user) {
      throw new NotFoundException('No user found — run `pnpm db:seed` first');
    }
    return user.id;
  }
}
