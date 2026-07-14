import { ApiProperty } from '@nestjs/swagger';

/** Uploader summary included with an attachment (no secrets). */
export class AttachmentUploader {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
}

/** Response shape for an Attachment row (bytes live in MinIO). */
export class AttachmentEntity {
  @ApiProperty() id!: string;
  @ApiProperty() taskId!: string;
  @ApiProperty({ example: 'design-spec.pdf' }) filename!: string;
  @ApiProperty({ example: 'application/pdf' }) mimeType!: string;
  @ApiProperty({ example: 20480, description: 'Size in bytes.' }) size!: number;
  @ApiProperty({ nullable: true }) uploadedById!: string | null;
  @ApiProperty({ nullable: true, type: () => AttachmentUploader })
  uploadedBy!: AttachmentUploader | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

/** Response shape for the presigned-download endpoint. */
export class AttachmentDownloadEntity {
  @ApiProperty({ example: 'http://localhost:9000/taskflow/...' })
  url!: string;
  @ApiProperty({ example: 300, description: 'URL lifetime in seconds.' })
  expiresIn!: number;
}
