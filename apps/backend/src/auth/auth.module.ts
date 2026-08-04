import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [PrismaModule,JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService,JwtAuthGuard,RolesGuard],
  exports: [JwtAuthGuard,RolesGuard],
})
export class AuthModule {}
