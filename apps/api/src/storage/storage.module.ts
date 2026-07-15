import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// Global so any feature (currently attachments) can inject StorageService.
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
