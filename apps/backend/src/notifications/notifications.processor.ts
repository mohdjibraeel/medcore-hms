import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Resend } from 'resend';
import { Twilio } from 'twilio';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly resend: Resend;
  private readonly twilioClient: Twilio;
  private readonly twilioFromNumber: string;

  constructor() {
    super();

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }
    this.resend = new Resend(resendApiKey);

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioSid || !twilioAuthToken || !twilioFromNumber) {
      throw new Error('Twilio environment variables are not fully set');
    }
    this.twilioClient = new Twilio(twilioSid, twilioAuthToken);
    this.twilioFromNumber = twilioFromNumber;
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job "${job.name}" with data: ${JSON.stringify(job.data)}`);

    switch (job.name) {
      case 'send-email':
        return this.handleSendEmail(job);
      case 'send-sms':
        return this.handleSendSms(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { processed: false };
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job?.id} (${job?.name}) FAILED: ${err.message}`);
  }

  private async handleSendEmail(job: Job): Promise<any> {
    const { to, subject, body } = job.data;

    const result = await this.resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject,
      html: `<p>${body}</p>`,
    });

    if (result.error) {
      this.logger.error(`Resend failed for job ${job.id}: ${result.error.message}`);
      throw new Error(`Resend send failed: ${result.error.message}`);
    }

    this.logger.log(`Email sent via Resend, id: ${result.data?.id}`);
    return { processed: true, resendId: result.data?.id };
  }

  private async handleSendSms(job: Job): Promise<any> {
    const { to, body } = job.data;

    const message = await this.twilioClient.messages.create({
      to,
      from: this.twilioFromNumber,
      body,
    });

    if (message.errorCode) {
      this.logger.error(`Twilio failed for job ${job.id}: ${message.errorMessage}`);
      throw new Error(`Twilio send failed: ${message.errorMessage}`);
    }

    this.logger.log(`SMS sent via Twilio, sid: ${message.sid}`);
    return { processed: true, twilioSid: message.sid };
  }
}