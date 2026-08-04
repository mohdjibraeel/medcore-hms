import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule,AuthModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService]
})
export class PrescriptionsModule {}
