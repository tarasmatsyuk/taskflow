import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailsProcessor } from './emails.processor';
import { EMAIL_QUEUE } from './mail.constants';
import { MailService } from './mail.service';

/**
 * Registers the `emails` queue + its worker. Re-exports BullModule so importing
 * modules (Tasks, Digest) can @InjectQueue(EMAIL_QUEUE) to enqueue jobs.
 */
@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [MailService, EmailsProcessor],
  exports: [BullModule, MailService],
})
export class MailModule {}
