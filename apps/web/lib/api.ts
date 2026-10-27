export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type Device = { id: number; name: string; type: string; lat: number; lng: number; online: boolean };
export type Telemetry = { deviceId: number; temperature: number; battery: number; alert?: boolean; at: string };
export type Alert = {
  id: number;
  deviceId: number;
  deviceName: string;
  type: 'TEMPERATURE' | 'BATTERY';
  value: number;
  threshold: number;
  message: string;
  at: string;
};

export function getToken() {
  return typeof window === 'undefined' ? null : sessionStorage.getItem('token');
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() ?? ''}`, ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// Démo publique : sans token valide, on demande un accès visiteur (lecture seule) à l'API
export async function demoLogin() {
  const res = await fetch(`${API_URL}/auth/demo`, { method: 'POST' });
  if (!res.ok) throw new Error(`${res.status}`);
  const { token } = (await res.json()) as { token: string };
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('demo', '1');
  return token;
}
