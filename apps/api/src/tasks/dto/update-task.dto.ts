import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

// All fields optional. Status can be changed here, but the dedicated
// move/reorder endpoint (slice 4) is the right tool for board drag-and-drop.
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
