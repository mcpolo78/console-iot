'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Alert, api, API_URL, Device, getToken, Telemetry } from '@/lib/api';

// Leaflet a besoin de window : pas de rendu serveur pour la carte
const DeviceMap = dynamic(() => import('./components/DeviceMap'), { ssr: false });

const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR');

export default function Dashboard() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [last, setLast] = useState<Record<number, Telemetry>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [banner, setBanner] = useState<Alert | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return router.push('/login');
    api<Device[]>('/devices').then(setDevices).catch(() => router.push('/login'));
    api<Alert[]>('/alerts').then(setAlerts).catch(() => {});

    const socket = io(API_URL, { auth: { token } });
    socket.on('telemetry', (t: Telemetry) => setLast((prev) => ({ ...prev, [t.deviceId]: t })));
    socket.on('alert', (a: Alert) => {
      setAlerts((prev) => [a, ...prev].slice(0, 50));
      setBanner(a);
    });
    return () => {
      socket.disconnect();
    };
  }, [router]);

  // Le bandeau disparaît après quelques secondes
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  return (
    <main>
      <h1>Supervision des équipements</h1>
      {banner && (
        <div className="banner" role="alert" onClick={() => setBanner(null)}>
          ⚠ {banner.deviceName} — {banner.message}
        </div>
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
                <tr key={d.id} className={last[d.id]?.alert ? 'alert' : undefined}>
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
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Journal des alertes</h2>
        {alerts.length === 0 ? (
          <p className="muted">Aucune alerte pour l’instant (seuils : température &gt; 26 °C, batterie &lt; 20 %).</p>
        ) : (
          <ul className="alerts">
            {alerts.map((a) => (
              <li key={a.id}>
                <span className="muted">{time(a.at)}</span> <strong>{a.deviceName}</strong> — {a.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
