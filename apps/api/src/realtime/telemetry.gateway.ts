import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

// Simule des équipements qui envoient leurs mesures toutes les 3 secondes
@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' } })
export class TelemetryGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      await this.jwt.verifyAsync(client.handshake.auth?.token);
    } catch {
      client.disconnect();
    }
  }

  afterInit() {
    setInterval(() => this.tick(), 3000);
  }

  private async tick() {
    // Pas de calcul inutile quand personne ne regarde (utile sur Cloud Run)
    if (this.server.engine.clientsCount === 0) return;
    const devices = await this.prisma.device.findMany();
    for (const d of devices) {
      const point = {
        deviceId: d.id,
        temperature: +(18 + Math.random() * 10).toFixed(1),
        battery: +(60 + Math.random() * 40).toFixed(0),
        at: new Date().toISOString(),
      };
      this.server.emit('telemetry', point);
    }
  }
}
