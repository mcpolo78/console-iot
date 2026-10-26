import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('alerts')
@UseGuards(JwtGuard)
export class AlertsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const alerts = await this.prisma.alert.findMany({
      orderBy: { at: 'desc' },
      take: 50,
      include: { device: { select: { name: true } } },
    });
    return alerts.map(({ device, ...a }) => ({ ...a, deviceName: device.name }));
  }
}
