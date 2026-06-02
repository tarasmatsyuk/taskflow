import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

/** Response shape for a Project (mirrors the Prisma model). */
export class ProjectEntity {
  @ApiProperty({ example: 'cmpwl8sab0005xrma3riu092y' })
  id!: string;

  @ApiProperty({ example: 'TF' })
  key!: string;

  @ApiProperty({ example: 'TaskFlow' })
  name!: string;

  @ApiProperty({ nullable: true, example: 'The full-stack board app.' })
  description!: string | null;

  @ApiProperty({ example: '#c2f24f' })
  color!: string;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.ACTIVE })
  status!: ProjectStatus;

  @ApiProperty({ example: 'cmpwl8s730000xrmav8x2g9e7' })
  ownerId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PageMeta {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class PaginatedProjects {
  @ApiProperty({ type: [ProjectEntity] })
  data!: ProjectEntity[];

  @ApiProperty({ type: PageMeta })
  meta!: PageMeta;
}
