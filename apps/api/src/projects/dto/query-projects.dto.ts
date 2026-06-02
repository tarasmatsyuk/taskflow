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
  // Pagination (1-based). Query params arrive as strings → @Type coerces to number.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  // Filtering
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  // Case-insensitive match on name OR key.
  @IsOptional()
  @IsString()
  search?: string;

  // Sorting
  @IsOptional()
  @IsEnum(ProjectSortBy)
  sortBy: ProjectSortBy = ProjectSortBy.createdAt;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.desc;
}
