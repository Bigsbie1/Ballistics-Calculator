
export type DragModel = 'G1' | 'G7';

export interface Rifle {
  barrelLength_m: number;
  twist_m: number;
  sightHeight_m: number;
  zeroRange_m: number;
}

export interface Bullet {
  mass_kg: number;
  diameter_m: number;
  ballisticCoefficient: number;
  dragModel: DragModel;
  muzzleVelocity_ms?: number;
  factoryVelocity_ms?: number;
}

export interface Environment {
  stationPressure_Pa?: number;
  altitude_m?: number;
  temperature_C: number;
  relativeHumidity: number; // 0..1
  windSpeed_ms: number;
  windDirection_deg: number; // where wind is coming from (met)
  incline_deg: number;
  latitude_deg?: number;
  heading_deg?: number;
}

export interface SolverOptions {
  step_m: number;
  maxRange_m: number;
  includeCoriolis?: boolean;
  includeSpinDrift?: boolean;
  includeAerodynamicJump?: boolean;
}

export interface Sample {
  range_m: number;
  drop_m: number;
  wind_m: number;
  tof_s: number;
  vel_ms: number;
  energy_J: number;
  moa: number;
  mil: number;
}
