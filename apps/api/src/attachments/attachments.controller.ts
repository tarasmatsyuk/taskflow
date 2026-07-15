import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttachmentsService, type MultipartFile } from './attachments.service';
import {
  AttachmentDownloadEntity,
  AttachmentEntity,
} from './entities/attachment.entity';
import { AttachmentMemberGuard } from './guards/attachment-member.guard';
import { TaskMemberGuard } from './guards/task-member.guard';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

/** Task-scoped upload + list: `/tasks/:taskId/attachments`. */
@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TaskMemberGuard)
@Controller('tasks/:taskId/attachments')
export class TaskAttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload a file attachment to a task (field: file)' })
  @ApiCreatedResponse({ type: AttachmentEntity })
  upload(
    @Param('taskId') taskId: string,
    @UploadedFile() file: MultipartFile,
    @CurrentUser('sub') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded (field name: "file")');
    }
    return this.attachments.create(taskId, file, userId);
  }

  @Get()
  @ApiOperation({ summary: "List a task's attachments" })
  @ApiOkResponse({ type: [AttachmentEntity] })
  list(@Param('taskId') taskId: string) {
    return this.attachments.findForTask(taskId);
  }
}

/** Attachment-scoped download + delete: `/attachments/:id`. */
@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AttachmentMemberGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a presigned download URL for an attachment' })
  @ApiOkResponse({ type: AttachmentDownloadEntity })
  download(@Param('id') id: string) {
    return this.attachments.downloadUrl(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an attachment (object + row)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  remove(@Param('id') id: string) {
    return this.attachments.remove(id);
  }
}
