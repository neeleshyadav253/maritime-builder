export type EngineState = "stopped" | "starting" | "running" | "tripped" | "failed";

export interface RampPoint {
    t: number;
    V: number;
    Hz: number;
}

export interface EngineParameters {
    rpm: number;
    voltage: number;
    frequency: number;
    kw: number;
    amps: number;
    loPressure: number;
    foPressure: number;
    jcfwPressure: number;
}

export interface InitialConditions {
    rpm: number;
    loPressureBar: number;
    foPressureBar: number;
    jcfwPressureBar: number;
    jcfwTempC: number;
    exhGasTempC: number;
    loSumpAvail: number;
    loSumpCapM3: number;
    fuelTankCapM3: number;
    fuelLevelPct: number;
    batteryV: number;
    hydraulicReservoirFull: boolean;
    shorePowerConnected: boolean;
}