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
const TICK_MS = 3000;
// Historique : une mesure enregistrée tous les 5 ticks (15 s), purge au-delà de 24 h (offre gratuite Neon)
const SAVE_EVERY = 5;
const RETENTION_MS = 24 * 3600 * 1000;
const PURGE_MS = 3600 * 1000;

@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' } })
export class TelemetryGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;
  private states = new Map<number, SimState>();
  private ticks = 0;

  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      await this.jwt.verifyAsync(client.handshake.auth?.token);
    } catch {
      client.disconnect();
    }
  }

  afterInit() {
    setInterval(() => this.tick().catch((e) => console.error('tick', e)), TICK_MS);
    const purge = () => this.purge().catch((e) => console.error('purge', e));
    purge();
    setInterval(purge, PURGE_MS);
  }

  private async purge() {
    const before = new Date(Date.now() - RETENTION_MS);
    await this.prisma.telemetry.deleteMany({ where: { at: { lt: before } } });
    await this.prisma.alert.deleteMany({ where: { at: { lt: before } } });
  }

  private async tick() {
    // Pas de calcul inutile quand personne ne regarde (utile sur Cloud Run)
    if (this.server.engine.clientsCount === 0) return;
    const devices = await this.prisma.device.findMany();
    const save = this.ticks++ % SAVE_EVERY === 0;
    const at = new Date();
    for (const d of devices) {
      const prev = this.states.get(d.id);
      const state = nextState(prev ?? initialState());
      this.states.set(d.id, state);
      const reading = toReading(state);
      const point = { deviceId: d.id, ...reading, alert: isAbnormal(reading), at: at.toISOString() };
      this.server.emit('telemetry', point);
      if (save) await this.prisma.telemetry.create({ data: { deviceId: d.id, ...reading, at } });

      for (const draft of detectAlerts(prev && toReading(prev), reading)) {
        const alert = await this.prisma.alert.create({ data: { ...draft, deviceId: d.id } });
        this.server.emit('alert', { ...alert, deviceName: d.name });
      }
    }
  }
}
