import { AlertType } from '@prisma/client';

export const THRESHOLDS = { temperatureMax: 26, batteryMin: 20 };

export type Reading = { temperature: number; battery: number };
export type AlertDraft = { type: AlertType; value: number; threshold: number; message: string };

export function isAbnormal(r: Reading) {
  return r.temperature > THRESHOLDS.temperatureMax || r.battery < THRESHOLDS.batteryMin;
}

// Une alerte par franchissement de seuil, pas une à chaque mesure tant que le seuil reste dépassé
export function detectAlerts(prev: Reading | undefined, cur: Reading): AlertDraft[] {
  const alerts: AlertDraft[] = [];
  const { temperatureMax, batteryMin } = THRESHOLDS;
  if (cur.temperature > temperatureMax && !(prev && prev.temperature > temperatureMax)) {
    alerts.push({
      type: AlertType.TEMPERATURE,
      value: cur.temperature,
      threshold: temperatureMax,
      message: `Température élevée : ${cur.temperature} °C (seuil ${temperatureMax} °C)`,
    });
  }
  if (cur.battery < batteryMin && !(prev && prev.battery < batteryMin)) {
    alerts.push({
      type: AlertType.BATTERY,
      value: cur.battery,
      threshold: batteryMin,
      message: `Batterie faible : ${cur.battery} % (seuil ${batteryMin} %)`,
    });
  }
  return alerts;
}
