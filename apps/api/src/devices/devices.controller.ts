import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('devices')
@UseGuards(JwtGuard)
export class DevicesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.device.findMany({ orderBy: { id: 'asc' } });
  }

  // Historique sur les N dernières minutes (60 par défaut, 24 h max), du plus ancien au plus récent
  @Get(':id/telemetry')
  telemetry(
    @Param('id', ParseIntPipe) id: number,
    @Query('minutes', new DefaultValuePipe(60), ParseIntPipe) minutes: number,
  ) {
    const since = new Date(Date.now() - Math.min(Math.max(minutes, 1), 1440) * 60_000);
    return this.prisma.telemetry.findMany({
      where: { deviceId: id, at: { gte: since } },
      orderBy: { at: 'asc' },
      select: { temperature: true, battery: true, at: true },
    });
  }
}
