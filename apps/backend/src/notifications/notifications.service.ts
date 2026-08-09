import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsService {
  constructor(@InjectQueue('notifications') private readonly notificationsQueue: Queue) {}

  async sendEmail(to: string, payload: Record<string, any>): Promise<void> {
    await this.notificationsQueue.add('send-email', { to, ...payload });
  }

  async sendSms(to: string, payload: Record<string, any>): Promise<void> {
    await this.notificationsQueue.add('send-sms', { to, ...payload });
  }
}