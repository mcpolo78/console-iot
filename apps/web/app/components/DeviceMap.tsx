'use client';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { Device, Telemetry } from '@/lib/api';

function markerColor(t?: Telemetry) {
  if (!t) return '#94a3b8';
  return t.alert ? '#ef4444' : '#22c55e';
}

type Props = { devices: Device[]; last: Record<number, Telemetry>; onSelect: (id: number) => void };

export default function DeviceMap({ devices, last, onSelect }: Props) {
  return (
    <MapContainer center={[48.9, 2.1]} zoom={10} style={{ height: 400, borderRadius: 8 }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {devices.map((d) => (
        <CircleMarker
          key={d.id}
          center={[d.lat, d.lng]}
          radius={10}
          pathOptions={{ color: markerColor(last[d.id]) }}
          eventHandlers={{ click: () => onSelect(d.id) }}
        >
          <Popup>
            {d.name} : {last[d.id]?.temperature ?? '?'} °C
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
