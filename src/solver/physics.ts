import type { Bullet, DragModel, Environment, Rifle, Sample, SolverOptions } from '../types'
import { toMIL, toMOA } from '../utils/units'
import { G1_POINTS, G7_POINTS, interp } from './dragTables'

type State = { x: number; y: number; vx: number; vy: number; t: number };

const g = 9.80665;
const Rd = 287.058;
const Rv = 461.495;

export function solveTrajectory(
  rifle: Rifle, bullet: Bullet, env: Environment, opts: SolverOptions
): Sample[] {
  const Tk = env.temperature_C + 273.15;
  const P = env.stationPressure_Pa ?? pressureFromAltitude(env.altitude_m ?? 0);
  const rho = airDensity(P, Tk, env.relativeHumidity);
  const a_sound = Math.sqrt(1.4 * Rd * Tk);

  const muzzle = bullet.muzzleVelocity_ms ?? estimateMuzzle(bullet, rifle.barrelLength_m);
  const windVec = windVector(env.windSpeed_ms, env.windDirection_deg);
  const m = bullet.mass_kg;

  const theta0 = solveZeroAngle(muzzle, rifle, bullet, rho, a_sound, windVec);

  let s: State = {
    x: 0, y: rifle.sightHeight_m,
    vx: muzzle * Math.cos(theta0),
    vy: muzzle * Math.sin(theta0),
    t: 0
  };
  const samples: Sample[] = [];

  const stepMeters = Math.max(1, Math.min(opts.step_m, 10));
  const maxX = opts.maxRange_m;

  let nextRecord = 0; // record every 25 m
  while (s.x <= maxX && s.y > -100) {
    // If we jumped past one or more record points, emit all missed marks
    while (s.x >= nextRecord) {
      const vel = Math.hypot(s.vx, s.vy);
      const energy = 0.5 * m * vel * vel;
      const drop = s.y - rifle.sightHeight_m;

      const range = nextRecord; // exact 0, 25, 50, ...
      const moa = toMOA(drop, Math.max(1, range));
      const mil = toMIL(drop, Math.max(1, range));

      samples.push({
        range_m: range,
        drop_m: drop,
        wind_m: 0,
        tof_s: s.t,
        vel_ms: vel,
        energy_J: energy,
        moa,
        mil
      });

      nextRecord += 25;
      if (nextRecord > maxX) break;
    }

    // relative wind
    const rvx = s.vx - windVec.x;
    const rvy = s.vy - windVec.y;
    const vAir = Math.hypot(rvx, rvy);

    const aDragMag = dragAccel(vAir, vAir / a_sound, bullet.dragModel, bullet.ballisticCoefficient, rho, m);
    const ax = -aDragMag * (rvx / (vAir || 1));
    const ay = -aDragMag * (rvy / (vAir || 1)) - g;

    // Integrate by ~stepMeters horizontal distance using variable timestep
    const h = stepMeters / Math.max(1e-3, Math.abs(s.vx));
    const deriv = (st: State) => {
      const rx = st.vx - windVec.x, ry = st.vy - windVec.y;
      const vv = Math.hypot(rx, ry);
      const aD = dragAccel(vv, vv / a_sound, bullet.dragModel, bullet.ballisticCoefficient, rho, m);
      const ax2 = -aD * (rx / (vv || 1));
      const ay2 = -aD * (ry / (vv || 1)) - g;
      return { dx: st.vx, dy: st.vy, dvx: ax2, dvy: ay2, dt: 1 };
    };

    const k1 = deriv(s);
    const k2 = deriv(stepState(s, k1, h / 2));
    const k3 = deriv(stepState(s, k2, h / 2));
    const k4 = deriv(stepState(s, k3, h));
    s = combineRK4(s, k1, k2, k3, k4, h);
  }

  return samples;
}

export function airDensity(P: number, Tk: number, RH: number){
  const es = 6.1078 * Math.pow(10, (7.5*(Tk-273.15))/(Tk-35.85)) * 100; // Pa
  const e = Math.max(0, Math.min(RH,1)) * es;
  const Pd = P - e;
  return Pd/(Rd*Tk) + e/(Rv*Tk);
}

export function pressureFromAltitude(h: number){
  // ISA up to 11km
  const P0 = 101325, T0 = 288.15, L = 0.0065, g0 = 9.80665, M = 0.0289644, R = 8.3144598;
  return P0 * Math.pow(1 - (L*h)/T0, (g0*M)/(R*L));
}

export function windVector(speed_ms: number, dir_deg: number){
  // Meteorological: coming from dir -> to bullet frame
  const rad = (dir_deg*Math.PI)/180;
  return {
    x: -speed_ms * Math.sin(rad),  // x-positive is downrange
    y: -speed_ms * Math.cos(rad)   // y-positive is up
  };
}

function dragAccel(v: number, mach: number, model: DragModel, BC: number, rho: number, m: number){
  const seaRho = 1.225;
  const points = model === 'G7' ? G7_POINTS : G1_POINTS;
  const i = interp(points, v);
  const scaled = i * (rho / seaRho) / Math.max(BC, 1e-6);
  return scaled; // m/s^2 magnitude
}

function stepState(s: State, k: any, h: number): State {
  return { x: s.x + h*k.dx, y: s.y + h*k.dy, vx: s.vx + h*k.dvx, vy: s.vy + h*k.dvy, t: s.t + h*k.dt };
}
function combineRK4(s: State, k1: any, k2: any, k3: any, k4: any, h: number): State {
  const dx = (k1.dx + 2*k2.dx + 2*k3.dx + k4.dx)/6;
  const dy = (k1.dy + 2*k2.dy + 2*k3.dy + k4.dy)/6;
  const dvx = (k1.dvx + 2*k2.dvx + 2*k3.dvx + k4.dvx)/6;
  const dvy = (k1.dvy + 2*k2.dvy + 2*k3.dvy + k4.dvy)/6;
  const dt = (k1.dt  + 2*k2.dt  + 2*k3.dt  + k4.dt )/6;
  return { x: s.x + h*dx, y: s.y + h*dy, vx: s.vx + h*dvx, vy: s.vy + h*dvy, t: s.t + h*dt };
}

function estimateMuzzle(bullet: Bullet, barrel_m: number){
  // Very rough: if factory available, adjust 10 fps per inch from 24" baseline
  if (bullet.factoryVelocity_ms){
    const baseline_m = 0.6096; // 24"
    const delta_in = (barrel_m - baseline_m)/0.0254;
    const delta_ms = (delta_in * 10) * 0.3048; // 10 fps/inch
    return Math.max(100, bullet.factoryVelocity_ms + delta_ms);
  }
  return 800;
}

function solveZeroAngle(mv: number, rifle: Rifle, bullet: Bullet, rho: number, a_sound: number, wind: {x:number,y:number}){
  // Binary search on small angles (-5..+5 deg) to hit zeroRange_m at LOS height
  let lo = -5*Math.PI/180, hi = 5*Math.PI/180;
  const targetX = rifle.zeroRange_m;
  const targetY = rifle.sightHeight_m;
  for (let it=0; it<24; it++){
    const mid = (lo+hi)/2;
    const hitY = simulateToX(mv, mid, targetX, bullet, rho, a_sound, wind, rifle.sightHeight_m);
    if (hitY > targetY) hi = mid; else lo = mid;
  }
  return (lo+hi)/2;
}

function simulateToX(mv: number, theta: number, targetX: number, bullet: Bullet, rho: number, a_sound: number, wind: {x:number,y:number}, startY: number){
  let s: State = { x: 0, y: startY, vx: mv*Math.cos(theta), vy: mv*Math.sin(theta), t: 0 };
  const stepMeters = 5;
  while (s.x < targetX) {
    const rx = s.vx - wind.x, ry = s.vy - wind.y;
    const vv = Math.hypot(rx, ry);
    const aD = dragAccel(vv, vv/a_sound, bullet.dragModel, bullet.ballisticCoefficient, rho, bullet.mass_kg);
    const ax = -aD * (rx / (vv || 1));
    const ay = -aD * (ry / (vv || 1)) - g;
    const h = stepMeters / Math.max(1e-3, Math.abs(s.vx));
    const k1 = { dx: s.vx, dy: s.vy, dvx: ax, dvy: ay, dt: 1 };
    const k2s = stepState(s, k1, h/2);
    const rx2 = k2s.vx - wind.x, ry2 = k2s.vy - wind.y;
    const vv2 = Math.hypot(rx2, ry2);
    const aD2 = dragAccel(vv2, vv2/a_sound, bullet.dragModel, bullet.ballisticCoefficient, rho, bullet.mass_kg);
    const k2 = { dx: k2s.vx, dy: k2s.vy, dvx: -aD2*(rx2/(vv2||1)), dvy: -aD2*(ry2/(vv2||1)) - g, dt: 1 };
    const k3s = stepState(s, k2, h/2);
    const rx3 = k3s.vx - wind.x, ry3 = k3s.vy - wind.y;
    const vv3 = Math.hypot(rx3, ry3);
    const aD3 = dragAccel(vv3, vv3/a_sound, bullet.dragModel, bullet.ballisticCoefficient, rho, bullet.mass_kg);
    const k3 = { dx: k3s.vx, dy: k3s.vy, dvx: -aD3*(rx3/(vv3||1)), dvy: -aD3*(ry3/(vv3||1)) - g, dt: 1 };
    const k4s = stepState(s, k3, h);
    const rx4 = k4s.vx - wind.x, ry4 = k4s.vy - wind.y;
    const vv4 = Math.hypot(rx4, ry4);
    const aD4 = dragAccel(vv4, vv4/a_sound, bullet.dragModel, bullet.ballisticCoefficient, rho, bullet.mass_kg);
    const k4 = { dx: k4s.vx, dy: k4s.vy, dvx: -aD4*(rx4/(vv4||1)), dvy: -aD4*(ry4/(vv4||1)) - g, dt: 1 };
    s = combineRK4(s, k1, k2, k3, k4, h);
  }
  return s.y;
}
