import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test-email')
  async testEmail(@Body('to') to: string) {
    await this.notificationsService.sendEmail(to, { subject: 'Test', body: 'Hello from BullMQ' });
    return { queued: true };
  }

  @Post('test-sms')
  async testSms(@Body('to') to: string) {
    // Twilio trial accounts require body to be an exact predefined template
    // name (not free text) — see: https://www.twilio.com/docs/usage/trials/try-out-sms
    await this.notificationsService.sendSms(to, { body: 'sms_appointment_reminders' });
    return { queued: true };
  }
}