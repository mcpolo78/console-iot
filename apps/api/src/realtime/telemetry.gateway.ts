import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { detectAlerts, isAbnormal } from '../alerts/thresholds';
import { PrismaService } from '../prisma/prisma.service';
import { initialState, nextState, SimState, toReading } from './simulation';

// Simule des équipements qui envoient leurs mesures toutes les 3 secondes
@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' } })
export class TelemetryGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;
  private states = new Map<number, SimState>();

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
      const prev = this.states.get(d.id);
      const state = nextState(prev ?? initialState());
      this.states.set(d.id, state);
      const reading = toReading(state);
      const point = { deviceId: d.id, ...reading, alert: isAbnormal(reading), at: new Date().toISOString() };
      this.server.emit('telemetry', point);

      for (const draft of detectAlerts(prev && toReading(prev), reading)) {
        const alert = await this.prisma.alert.create({ data: { ...draft, deviceId: d.id } });
        this.server.emit('alert', { ...alert, deviceName: d.name });
      }
    }
  }
}
