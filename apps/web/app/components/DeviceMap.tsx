'use client';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { Device, Telemetry } from '@/lib/api';

export default function DeviceMap({ devices, last }: { devices: Device[]; last: Record<number, Telemetry> }) {
  return (
    <MapContainer center={[48.9, 2.1]} zoom={10} style={{ height: 400, borderRadius: 8 }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {devices.map((d) => (
        <CircleMarker key={d.id} center={[d.lat, d.lng]} radius={10} pathOptions={{ color: last[d.id] ? '#22c55e' : '#94a3b8' }}>
          <Popup>
            {d.name} : {last[d.id]?.temperature ?? '?'} °C
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
