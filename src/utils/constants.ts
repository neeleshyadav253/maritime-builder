import type { InitialConditions, RampPoint } from "../types";

export const INITIALS: InitialConditions = {
    rpm: 0,
    loPressureBar: 0,
    foPressureBar: 0,
    jcfwPressureBar: 0,
    jcfwTempC: 36.1,
    exhGasTempC: 37.0,
    loSumpAvail: 0.6, // 60% of 0.2 m³
    loSumpCapM3: 0.2,
    fuelTankCapM3: 1.5,
    fuelLevelPct: 0.8, // 80% initially
    batteryV: 24.0,
    hydraulicReservoirFull: true,
    shorePowerConnected: false,
};

export const RAMP_POINTS: RampPoint[] = [
    { t: 0, V: 220, Hz: 56 },
    { t: 20, V: 240, Hz: 56.5 },
    { t: 40, V: 300, Hz: 57 },
    { t: 80, V: 340, Hz: 58 },
    { t: 100, V: 380, Hz: 58.5 },
    { t: 120, V: 420, Hz: 59 },
    { t: 200, V: 440, Hz: 60 },
];

// Running parameters when on load
export const RUNNING_PARAMS = {
    voltage: 440,
    frequency: 60,
    kw: 6.1,
    amps: 10,
    rpm: 600, // 60 Hz * 10
};

export const fmt = {
    num: (n: number, d = 1) => n.toFixed(d),
    pct: (n: number, d = 0) => `${(n * 100).toFixed(d)}%`,
};

export function interpRamp(elapsed: number) {
    if (elapsed <= 0) return { V: 220, Hz: 56 };
    for (let i = 1; i < RAMP_POINTS.length; i++) {
        const a = RAMP_POINTS[i - 1];
        const b = RAMP_POINTS[i];
        if (elapsed <= b.t) {
            const k = (elapsed - a.t) / (b.t - a.t);
            return { V: a.V + k * (b.V - a.V), Hz: a.Hz + k * (b.Hz - a.Hz) };
        }
    }
    return { V: 440, Hz: 60 };
}