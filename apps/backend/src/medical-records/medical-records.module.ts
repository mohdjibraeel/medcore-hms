import { Module } from '@nestjs/common';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule,JwtModule,AuthModule],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService]
})
export class MedicalRecordsModule {}
