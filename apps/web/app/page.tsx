'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, API_URL, Device, getToken, Telemetry } from '@/lib/api';

// Leaflet a besoin de window : pas de rendu serveur pour la carte
const DeviceMap = dynamic(() => import('./components/DeviceMap'), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [last, setLast] = useState<Record<number, Telemetry>>({});

  useEffect(() => {
    const token = getToken();
    if (!token) return router.push('/login');
    api<Device[]>('/devices').then(setDevices).catch(() => router.push('/login'));

    const socket = io(API_URL, { auth: { token } });
    socket.on('telemetry', (t: Telemetry) => setLast((prev) => ({ ...prev, [t.deviceId]: t })));
    return () => {
      socket.disconnect();
    };
  }, [router]);

  return (
    <main>
      <h1>Supervision des équipements</h1>
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
