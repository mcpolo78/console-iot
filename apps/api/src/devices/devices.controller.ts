import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
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

  @Get(':id/telemetry')
  telemetry(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.telemetry.findMany({ where: { deviceId: id }, orderBy: { at: 'desc' }, take: 50 });
  }
}
