import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { DigestService } from './digest.service';

// MailModule re-exports the `emails` queue used to enqueue digest jobs.
@Module({
  imports: [MailModule],
  providers: [DigestService],
})
export class DigestModule {}
