'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, API_URL, demoLogin, Device, getToken, Telemetry } from '@/lib/api';

// Leaflet a besoin de window : pas de rendu serveur pour la carte
const DeviceMap = dynamic(() => import('./components/DeviceMap'), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [last, setLast] = useState<Record<number, Telemetry>>({});
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let socket: ReturnType<typeof io> | undefined;
    let cancelled = false;

    async function start() {
      // Pas de token (ou token expiré) : accès visiteur automatique, sinon écran de connexion
      let token = getToken();
      let list = token ? await api<Device[]>('/devices').catch(() => null) : null;
      if (!list) {
        try {
          token = await demoLogin();
          list = await api<Device[]>('/devices');
        } catch {
          return router.push('/login');
        }
      }
      if (cancelled) return;
      setDevices(list);
      setDemo(sessionStorage.getItem('demo') === '1');
      socket = io(API_URL, { auth: { token } });
      socket.on('telemetry', (t: Telemetry) => setLast((prev) => ({ ...prev, [t.deviceId]: t })));
    }

    start();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [router]);

  return (
    <main>
      <h1>Supervision des équipements</h1>
      {demo && (
        <p className="demo">
          Démo en lecture seule, sans compte. <Link href="/login">Se connecter avec un compte de test</Link>
        </p>
      )}
      <div className="grid">
        <div className="card">
          <DeviceMap devices={devices} last={last} />
        </div>
        <div className="card">
          <table>
            <thead>
              <tr><th>Équipement</th><th>Type</th><th>Temp.</th><th>Batterie</th></tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.type}</td>
                  <td>{last[d.id]?.temperature ?? '–'} °C</td>
                  <td>{last[d.id]?.battery ?? '–'} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
