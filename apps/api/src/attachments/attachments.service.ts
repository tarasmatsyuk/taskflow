import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

/** Minimal shape of a memory-stored Multer file (avoids a hard @types/multer dep). */
export interface MultipartFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Fields returned with an attachment (uploader summary, no secrets).
const withUploader = {
  uploadedBy: { select: { id: true, name: true, email: true } },
} as const;

const PRESIGN_TTL = 300; // seconds

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(
    taskId: string,
    file: MultipartFile,
    uploadedById: string,
  ) {
    // Unique, collision-proof object key; keep the extension for readability.
    const storageKey = `tasks/${taskId}/${randomUUID()}-${file.originalname}`;
    await this.storage.putObject(storageKey, file.buffer, file.mimetype);

    return this.prisma.attachment.create({
      data: {
        taskId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
        uploadedById,
      },
      include: withUploader,
    });
  }

  findForTask(taskId: string) {
    return this.prisma.attachment.findMany({
      where: { taskId },
      include: withUploader,
      orderBy: { createdAt: 'desc' },
    });
  }

  async downloadUrl(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${id} not found`);
    }
    const url = await this.storage.presignedGetUrl(
      attachment.storageKey,
      attachment.filename,
      PRESIGN_TTL,
    );
    return { url, expiresIn: PRESIGN_TTL };
  }

  async remove(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${id} not found`);
    }
    // Best-effort object delete, then drop the row.
    await this.storage.removeObject(attachment.storageKey).catch(() => undefined);
    await this.prisma.attachment.delete({ where: { id } });
  }
}
