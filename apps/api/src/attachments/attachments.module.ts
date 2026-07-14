import { Module } from '@nestjs/common';
import {
  AttachmentsController,
  TaskAttachmentsController,
} from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentMemberGuard } from './guards/attachment-member.guard';
import { TaskMemberGuard } from './guards/task-member.guard';

@Module({
  controllers: [TaskAttachmentsController, AttachmentsController],
  providers: [AttachmentsService, TaskMemberGuard, AttachmentMemberGuard],
})
export class AttachmentsModule {}
