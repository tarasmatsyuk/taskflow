import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AssignmentJobData, DigestJobData } from './mail.constants';

/**
 * SMTP transport (Mailhog in dev). Builds the actual email bodies; the BullMQ
 * processor calls these so sending happens off the request path.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('MAIL_FROM', 'TaskFlow <no-reply@taskflow.dev>');
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: Number(this.config.get<string>('SMTP_PORT', '1025')),
      secure: false, // Mailhog is plaintext
    });
  }

  async sendAssignment(data: AssignmentJobData) {
    const ref = `${data.projectKey}-${data.taskNumber}`;
    await this.transporter.sendMail({
      from: this.from,
      to: data.to,
      subject: `[${ref}] You were assigned: ${data.taskTitle}`,
      text:
        `Hi ${data.assigneeName},\n\n` +
        `You have been assigned task ${ref}: "${data.taskTitle}".\n`,
    });
    this.logger.log(`Sent assignment email to ${data.to} for ${ref}`);
  }

  async sendDigest(data: DigestJobData) {
    const lines = data.tasks
      .map(
        (t) =>
          `- ${t.projectKey}-${t.number}: ${t.title} (due ${new Date(
            t.dueDate,
          ).toLocaleString()})`,
      )
      .join('\n');
    await this.transporter.sendMail({
      from: this.from,
      to: data.to,
      subject: `TaskFlow: ${data.tasks.length} task(s) due soon`,
      text:
        `Hi ${data.assigneeName},\n\n` +
        `These tasks are due within the next 48 hours:\n\n${lines}\n`,
    });
    this.logger.log(
      `Sent digest email to ${data.to} (${data.tasks.length} tasks)`,
    );
  }
}
