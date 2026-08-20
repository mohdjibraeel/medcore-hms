import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Send a test email (debug/testing only)' })
  @Post('test-email')
  async testEmail(@Body('to') to: string) {
    await this.notificationsService.sendEmail(to, { subject: 'Test', body: 'Hello from BullMQ' });
    return { queued: true };
  }

  @ApiOperation({ summary: 'Send a test SMS (debug/testing only)' })
  @Post('test-sms')
  async testSms(@Body('to') to: string) {
    await this.notificationsService.sendSms(to, { body: 'sms_appointment_reminders' });
    return { queued: true };
  }
}