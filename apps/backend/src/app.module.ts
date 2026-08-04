import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { DepartmentsModule } from './departments/departments.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    HospitalsModule,
    DepartmentsModule,
    DoctorsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    PrescriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
