import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum ProjectSortBy {
  createdAt = 'createdAt',
  name = 'name',
  key = 'key',
}

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export class QueryProjectsDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: '1-based page.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @ApiPropertyOptional({ enum: ProjectStatus, description: 'Filter by status.' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description: 'Case-insensitive match on name OR key.',
    example: 'site',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProjectSortBy, default: ProjectSortBy.createdAt })
  @IsOptional()
  @IsEnum(ProjectSortBy)
  sortBy: ProjectSortBy = ProjectSortBy.createdAt;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.desc })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.desc;
}
