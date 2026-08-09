import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsProcessor, NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}