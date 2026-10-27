'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Alert, api, API_URL, demoLogin, Device, getToken, Telemetry } from '@/lib/api';

// Leaflet a besoin de window : pas de rendu serveur pour la carte
const DeviceMap = dynamic(() => import('./components/DeviceMap'), { ssr: false });
const TemperatureChart = dynamic(() => import('./components/TemperatureChart'), { ssr: false });

const HOUR_MS = 3600 * 1000;
type Point = { at: string; temperature: number };

const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR');

export default function Dashboard() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [last, setLast] = useState<Record<number, Telemetry>>({});
  const [demo, setDemo] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [banner, setBanner] = useState<Alert | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<Point[]>([]);
  const selectedRef = useRef<number | null>(null);

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
      api<Alert[]>('/alerts').then(setAlerts).catch(() => {});

      socket = io(API_URL, { auth: { token } });
      socket.on('telemetry', (t: Telemetry) => {
        setLast((prev) => ({ ...prev, [t.deviceId]: t }));
        // Les mesures en direct complètent l'historique de l'équipement sélectionné
        if (t.deviceId === selectedRef.current) {
          const since = Date.now() - HOUR_MS;
          setHistory((prev) => [...prev.filter((p) => new Date(p.at).getTime() >= since), t]);
        }
      });
      socket.on('alert', (a: Alert) => {
        setAlerts((prev) => [a, ...prev].slice(0, 50));
        setBanner(a);
      });
    }

    start();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [router]);

  function select(id: number) {
    selectedRef.current = id;
    setSelected(id);
    setHistory([]);
    api<Point[]>(`/devices/${id}/telemetry?minutes=60`)
      .then((h) => selectedRef.current === id && setHistory((live) => [...h, ...live]))
      .catch(() => {});
  }

  const selectedDevice = devices.find((d) => d.id === selected);

  // Le bandeau disparaît après quelques secondes
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  return (
    <main>
      <h1>Supervision des équipements</h1>
      {demo && (
        <p className="demo">Démo en lecture seule, sans compte.</p>
      )}
      {banner && (
        <div className="banner" role="alert" onClick={() => setBanner(null)}>
          ⚠ {banner.deviceName} — {banner.message}
        </div>
      )}
      <div className="grid">
        <div className="card">
          <DeviceMap devices={devices} last={last} onSelect={select} />
        </div>
        <div className="card">
          <table>
            <thead>
              <tr><th>Équipement</th><th>Type</th><th>Temp.</th><th>Batterie</th></tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => select(d.id)}
                  className={[last[d.id]?.alert && 'alert', d.id === selected && 'selected'].filter(Boolean).join(' ')}
                >
                  <td>{d.name}</td>
                  <td>{d.type}</td>
                  <td>{last[d.id]?.temperature ?? '–'} °C</td>
                  <td>{last[d.id]?.battery ?? '–'} %</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Cliquer sur un équipement pour voir sa température sur la dernière heure.</p>
        </div>
      </div>
      {selectedDevice && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Température – {selectedDevice.name} (1 h)</h2>
          {history.length === 0 ? (
            <p className="muted">Chargement de l’historique…</p>
          ) : (
            <TemperatureChart points={history} threshold={26} />
          )}
        </section>
      )}
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
