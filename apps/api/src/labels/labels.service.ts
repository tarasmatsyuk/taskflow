import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  list(projectId: string) {
    return this.prisma.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async create(projectId: string, dto: CreateLabelDto) {
    const existing = await this.prisma.label.findUnique({
      where: { projectId_name: { projectId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`Label "${dto.name}" already exists`);
    }
    return this.prisma.label.create({
      data: { projectId, name: dto.name, color: dto.color },
    });
  }

  async remove(projectId: string, labelId: string) {
    const label = await this.prisma.label.findFirst({
      where: { id: labelId, projectId },
    });
    if (!label) {
      throw new NotFoundException(`Label ${labelId} not found`);
    }
    await this.prisma.label.delete({ where: { id: labelId } });
  }
}
