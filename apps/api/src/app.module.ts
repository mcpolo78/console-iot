import { Controller, Get, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [PrismaModule, AuthModule, DevicesModule, RealtimeModule],
  controllers: [HealthController],
})
export class AppModule {}
