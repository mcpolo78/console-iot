import { Reading } from '../alerts/thresholds';

// État simulé d'un équipement : température qui oscille autour de 22 °C avec des pics
// occasionnels au-dessus de 26 °C, batterie qui se vide puis est remplacée
export type SimState = Reading & { spike: number };

export function initialState(rand = Math.random): SimState {
  return { temperature: +(20 + rand() * 4).toFixed(1), battery: Math.round(25 + rand() * 75), spike: 0 };
}

export function nextState(s: SimState, rand = Math.random): SimState {
  let spike = s.spike > 0 ? s.spike - 1 : rand() < 0.01 ? 5 + Math.floor(rand() * 6) : 0;
  const target = spike > 0 ? 28.5 : 22;
  const temperature = +(s.temperature + (target - s.temperature) * 0.3 + (rand() - 0.5) * 1.2).toFixed(1);
  let battery = Math.round((s.battery - 0.3 - rand() * 0.4) * 10) / 10;
  if (battery < 12) battery = 100; // batterie remplacée
  return { temperature, battery, spike };
}

// Valeurs publiées : batterie arrondie au pourcent
export function toReading(s: SimState): Reading {
  return { temperature: s.temperature, battery: Math.round(s.battery) };
}
