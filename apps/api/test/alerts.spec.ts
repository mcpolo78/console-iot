import { detectAlerts, isAbnormal } from '../src/alerts/thresholds';
import { initialState, nextState, toReading } from '../src/realtime/simulation';

describe('seuils d’alerte', () => {
  it('déclenche une alerte température au-dessus de 26 °C', () => {
    const [a] = detectAlerts({ temperature: 25, battery: 80 }, { temperature: 27.2, battery: 80 });
    expect(a).toMatchObject({ type: 'TEMPERATURE', value: 27.2, threshold: 26 });
  });

  it('déclenche une alerte batterie sous 20 %', () => {
    const [a] = detectAlerts({ temperature: 22, battery: 20 }, { temperature: 22, battery: 19 });
    expect(a).toMatchObject({ type: 'BATTERY', value: 19, threshold: 20 });
  });

  it('ne répète pas l’alerte tant que le seuil reste dépassé', () => {
    expect(detectAlerts({ temperature: 27, battery: 15 }, { temperature: 28, battery: 14 })).toEqual([]);
  });

  it('rien à signaler dans les valeurs normales', () => {
    expect(detectAlerts(undefined, { temperature: 22, battery: 80 })).toEqual([]);
    expect(isAbnormal({ temperature: 26, battery: 20 })).toBe(false);
  });
});

describe('simulation', () => {
  it('produit des alertes de temps en temps sur une heure', () => {
    let s = initialState();
    let count = 0;
    for (let i = 0; i < 1200; i++) {
      const next = nextState(s);
      count += detectAlerts(toReading(s), toReading(next)).length;
      s = next;
    }
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(200);
  });
});
