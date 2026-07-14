import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  AssignmentJobData,
  DigestJobData,
  EMAIL_JOB,
  EMAIL_QUEUE,
} from './mail.constants';
import { MailService } from './mail.service';

/** Consumes the `emails` queue and dispatches to MailService by job name. */
@Processor(EMAIL_QUEUE)
export class EmailsProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailsProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case EMAIL_JOB.assignment:
        await this.mail.sendAssignment(job.data as AssignmentJobData);
        break;
      case EMAIL_JOB.digest:
        await this.mail.sendDigest(job.data as DigestJobData);
        break;
      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }
}
