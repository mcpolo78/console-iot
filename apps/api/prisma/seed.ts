import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);
  for (const [email, role] of [
    ['admin@demo.fr', Role.ADMIN],
    ['operateur@demo.fr', Role.OPERATOR],
    ['lecteur@demo.fr', Role.VIEWER],
  ] as const) {
    await prisma.user.upsert({ where: { email }, update: {}, create: { email, passwordHash, role } });
  }
  if ((await prisma.device.count()) === 0) {
    await prisma.device.createMany({
      data: [
        { name: 'Capteur Versailles', type: 'thermique', lat: 48.8049, lng: 2.1204 },
        { name: 'Capteur Guyancourt', type: 'thermique', lat: 48.7731, lng: 2.0739 },
        { name: 'Balise Conflans', type: 'gps', lat: 48.9993, lng: 2.0969 },
        { name: 'Relais Cergy', type: 'radio', lat: 49.0364, lng: 2.0761 },
      ],
    });
  }
}

main().finally(() => prisma.$disconnect());
