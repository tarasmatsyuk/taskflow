import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';

/**
 * Thin wrapper over the MinIO S3 client. Owns the bucket lifecycle (creates it
 * on startup if missing) and exposes put/get-url/remove for attachment bytes.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: MinioClient;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'taskflow');
    this.client = new MinioClient({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: Number(this.config.get<string>('MINIO_PORT', '9000')),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created MinIO bucket "${this.bucket}"`);
      }
    } catch (err) {
      // Don't crash the app if MinIO is down at boot; log and continue.
      this.logger.warn(
        `MinIO bucket check failed (is MinIO up?): ${(err as Error).message}`,
      );
    }
  }

  async putObject(
    key: string,
    body: Buffer,
    mimeType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, key, body, body.length, {
      'Content-Type': mimeType,
    });
  }

  /** Presigned GET URL (default 5 min) the browser can download directly. */
  presignedGetUrl(
    key: string,
    filename: string,
    expirySeconds = 300,
  ): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds, {
      'response-content-disposition': `attachment; filename="${filename}"`,
    });
  }

  async removeObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
