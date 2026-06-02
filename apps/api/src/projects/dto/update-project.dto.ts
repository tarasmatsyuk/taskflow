import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

/**
 * PATCH semantics: all CreateProjectDto fields become optional (inheriting the
 * same validation + Swagger metadata). ownerId is omitted — ownership isn't
 * editable here.
 */
export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['ownerId'] as const),
) {}
