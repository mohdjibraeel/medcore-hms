import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { HospitalsModule } from './hospitals/hospitals.module';
import { DepartmentsModule } from './departments/departments.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { LabOrdersModule } from './lab-orders/lab-orders.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { InvoicesModule } from './invoices/invoices.module';
import { RedisModule } from './redis/redis.module';
import { getBullMQConfig } from 'test-bullmq';
import { BullModule } from '@nestjs/bullmq/dist/bull.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PatientsModule } from './patients/patients.module';

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
    LabOrdersModule,
    PharmacyModule,
    InvoicesModule,
    RedisModule,
    BullModule.forRoot(getBullMQConfig()),
    NotificationsModule,
    PaymentsModule,
    PatientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}