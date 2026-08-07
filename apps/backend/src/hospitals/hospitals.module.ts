import { Module } from '@nestjs/common';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DepartmentsModule } from 'src/departments/departments.module';

@Module({
  imports: [PrismaModule, AuthModule,DepartmentsModule],
  controllers: [HospitalsController],
  providers: [HospitalsService],
})
export class HospitalsModule {}