'use client';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type Point = { at: string; temperature: number };


export default function TemperatureChart({ points, threshold }: { points: Point[]; threshold: number }) {
  const data = points.map((p) => ({ t: new Date(p.at).getTime(), temperature: p.temperature }));
  // Secondes affichées tant que l'historique couvre moins de 10 min (sinon graduations en double)
  const span = data.length ? data[data.length - 1].t - data[0].t : 0;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', ...(span < 600_000 && { second: '2-digit' }) });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
        <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={fmt} minTickGap={48} stroke="#94a3b8" />
        <YAxis domain={[16, 32]} unit="°" stroke="#94a3b8" />
        <Tooltip
          labelFormatter={(v) => new Date(Number(v)).toLocaleTimeString('fr-FR')}
          formatter={(v) => [`${v} °C`, 'Température']}
          contentStyle={{ background: '#0f172a', border: '1px solid #475569' }}
        />
        <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `seuil ${threshold} °C`, fill: '#fca5a5', position: 'insideTopRight' }} />
        <Line type="monotone" dataKey="temperature" stroke="#38bdf8" dot={false} isAnimationActive={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
