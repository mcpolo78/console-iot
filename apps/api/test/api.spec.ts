import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AlertsModule } from '../src/alerts/alerts.module';
import { AuthModule } from '../src/auth/auth.module';
import { DevicesModule } from '../src/devices/devices.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Prisma est remplacé par un double en mémoire : pas besoin de base pour ces tests
const devices = [
  { id: 1, name: 'Capteur Versailles', type: 'thermique', lat: 48.8, lng: 2.12, online: true },
  { id: 2, name: 'Relais Cergy', type: 'radio', lat: 49.03, lng: 2.07, online: true },
];
let users: { id: number; email: string; passwordHash: string; role: string }[] = [];

const prismaMock = {
  user: { findUnique: jest.fn(({ where }) => users.find((u) => u.email === where.email) ?? null) },
  device: { findMany: jest.fn(async () => devices) },
  telemetry: { findMany: jest.fn(async (_args: unknown) => [{ temperature: 22.4, battery: 80, at: new Date() }]) },
  alert: {
    findMany: jest.fn(async () => [
      { id: 1, deviceId: 1, type: 'TEMPERATURE', value: 27.5, threshold: 26, message: 'Température élevée', at: new Date(), device: { name: 'Capteur Versailles' } },
    ]),
  },
};

describe('API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    users = [{ id: 1, email: 'admin@demo.fr', passwordHash: await bcrypt.hash('demo1234', 4), role: 'ADMIN' }];
    const moduleRef = await Test.createTestingModule({ imports: [PrismaModule, AuthModule, DevicesModule, AlertsModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());

  async function login() {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@demo.fr', password: 'demo1234' });
    return res.body.token as string;
  }

  describe('POST /auth/login', () => {
    it('renvoie un token et le rôle avec de bons identifiants', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@demo.fr', password: 'demo1234' })
        .expect(201);
      expect(res.body.role).toBe('ADMIN');
      expect(res.body.token.split('.')).toHaveLength(3);
    });

    it('refuse un mauvais mot de passe (401)', () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@demo.fr', password: 'mauvais-mdp' })
        .expect(401));

    it('refuse un compte inconnu (401)', () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inconnu@demo.fr', password: 'demo1234' })
        .expect(401));

    it('valide le format de la requête (400)', () =>
      request(app.getHttpServer()).post('/auth/login').send({ email: 'pas-un-email', password: 'x' }).expect(400));
  });

  describe('POST /auth/demo', () => {
    afterEach(() => delete process.env.DEMO_LOGIN);

    it('donne un accès visiteur (VIEWER) sans mot de passe, accepté par la garde', async () => {
      const res = await request(app.getHttpServer()).post('/auth/demo').expect(201);
      expect(res.body.role).toBe('VIEWER');
      await request(app.getHttpServer())
        .get('/devices')
        .set('Authorization', `Bearer ${res.body.token}`)
        .expect(200);
    });

    it('est désactivable avec DEMO_LOGIN=false (404)', () => {
      process.env.DEMO_LOGIN = 'false';
      return request(app.getHttpServer()).post('/auth/demo').expect(404);
    });
  });

  describe('garde JWT', () => {
    it('refuse une requête sans token (401)', () => request(app.getHttpServer()).get('/devices').expect(401));

    it('refuse un token invalide (401)', () =>
      request(app.getHttpServer()).get('/devices').set('Authorization', 'Bearer faux.token.jwt').expect(401));
  });

  describe('GET /devices', () => {
    it('liste les équipements avec un token valide', async () => {
      const token = await login();
      const res = await request(app.getHttpServer())
        .get('/devices')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Capteur Versailles');
    });

    it("rejette un identifiant d'équipement non numérique (400)", async () => {
      const token = await login();
      await request(app.getHttpServer())
        .get('/devices/abc/telemetry')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('GET /devices/:id/telemetry', () => {
    it("renvoie l'historique de la dernière heure par défaut, du plus ancien au plus récent", async () => {
      const token = await login();
      const res = await request(app.getHttpServer())
        .get('/devices/1/telemetry')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body[0].temperature).toBe(22.4);
      const args = prismaMock.telemetry.findMany.mock.calls.at(-1)![0] as any;
      expect(args.where.deviceId).toBe(1);
      expect(args.orderBy).toEqual({ at: 'asc' });
      expect(Date.now() - args.where.at.gte.getTime()).toBeGreaterThanOrEqual(60 * 60_000 - 1000);
      expect(Date.now() - args.where.at.gte.getTime()).toBeLessThan(60 * 60_000 + 5000);
    });

    it('plafonne la fenêtre à 24 h', async () => {
      const token = await login();
      await request(app.getHttpServer())
        .get('/devices/1/telemetry?minutes=99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const args = prismaMock.telemetry.findMany.mock.calls.at(-1)![0] as any;
      expect(Date.now() - args.where.at.gte.getTime()).toBeLessThan(1441 * 60_000);
    });
  });

  describe('GET /alerts', () => {
    it('est protégé par le JWT (401)', () => request(app.getHttpServer()).get('/alerts').expect(401));

    it('renvoie le journal avec le nom de l’équipement', async () => {
      const token = await login();
      const res = await request(app.getHttpServer()).get('/alerts').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body[0]).toMatchObject({ type: 'TEMPERATURE', deviceName: 'Capteur Versailles' });
      expect(res.body[0].device).toBeUndefined();
    });
  });
});
