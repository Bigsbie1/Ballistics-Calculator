import React, { useMemo, useState } from 'react'
import { solveTrajectory } from './solver/physics'
import type { Bullet, Environment, Rifle, SolverOptions, Sample } from './types'
import { inch, grain, fps, yard } from "./utils/units"

const defaultRifle: Rifle = {
  barrelLength_m: 16*inch,
  twist_m: 7*inch,
  sightHeight_m: 2.5*inch,
  zeroRange_m: 100*yard
}
const defaultBullet: Bullet = {
  mass_kg: 77*grain,
  diameter_m: 0.224*inch,
  ballisticCoefficient: 0.372, // approx G7 for 77gr SMK
  dragModel: 'G7',
  factoryVelocity_ms: 2750*fps
}
const defaultEnv: Environment = {
  altitude_m: 300,
  temperature_C: 15,
  relativeHumidity: 0.5,
  windSpeed_ms: 0,
  windDirection_deg: 90,
  incline_deg: 0,
}
const defaultOpts: SolverOptions = {
  step_m: 2,
  maxRange_m: 1000
}

export default function App(){
  const [rifle, setRifle] = useState<Rifle>(defaultRifle)
  const [bullet, setBullet] = useState<Bullet>(defaultBullet)
  const [env, setEnv] = useState<Environment>(defaultEnv)
  const [opts, setOpts] = useState<SolverOptions>(defaultOpts)
  const [units, setUnits] = useState<'MOA'|'MIL'>('MIL')

  const samples = useMemo<Sample[]>(() => {
    try { return solveTrajectory(rifle, bullet, env, opts) }
    catch (e){ console.error(e); return [] }
  }, [rifle, bullet, env, opts])

  function num(v: string){ const n = Number(v); return Number.isFinite(n) ? n : 0 }

  return (
    <div className="container">
      <h1>Ballistics Calculator (MVP)</h1>
      <div className="row" style={{marginBottom:12}}>
        <span className="badge">Point-Mass</span>
        <span className="badge">G1/G7 (compact)</span>
        <span className="badge">RK4</span>
      </div>
      <div className="grid grid-3">
        <section className="card">
          <h2>Rifle</h2>
          <label>Barrel length (in)</label>
          <input value={(rifle.barrelLength_m/inch).toFixed(2)} onChange={e => setRifle({...rifle, barrelLength_m: num(e.target.value)*inch})} />
          <label>Twist (in/turn)</label>
          <input value={(rifle.twist_m/inch).toFixed(2)} onChange={e => setRifle({...rifle, twist_m: num(e.target.value)*inch})} />
          <label>Sight height (in)</label>
          <input value={(rifle.sightHeight_m/inch).toFixed(2)} onChange={e => setRifle({...rifle, sightHeight_m: num(e.target.value)*inch})} />
          <label>Zero range (yd)</label>
          <input value={(rifle.zeroRange_m/yard).toFixed(0)} onChange={e => setRifle({...rifle, zeroRange_m: num(e.target.value)*yard})} />
        </section>

        <section className="card">
          <h2>Bullet / Ammo</h2>
          <label>Mass (gr)</label>
          <input value={(bullet.mass_kg/grain).toFixed(1)} onChange={e => setBullet({...bullet, mass_kg: num(e.target.value)*grain})} />
          <label>BC</label>
          <input value={bullet.ballisticCoefficient} onChange={e => setBullet({...bullet, ballisticCoefficient: num(e.target.value)})} />
          <label>Model</label>
          <select value={bullet.dragModel} onChange={e => setBullet({...bullet, dragModel: e.target.value as any})}>
            <option value="G1">G1</option>
            <option value="G7">G7</option>
          </select>
          <label>Muzzle velocity (fps)</label>
          <input value={((bullet.muzzleVelocity_ms ?? bullet.factoryVelocity_ms ?? 2750*fps)/fps).toFixed(0)}
            onChange={e => setBullet({...bullet, muzzleVelocity_ms: num(e.target.value)*fps})} />
        </section>

        <section className="card">
          <h2>Environment</h2>
          <label>Altitude (m)</label>
          <input value={env.altitude_m ?? 0} onChange={e => setEnv({...env, altitude_m: num(e.target.value)})} />
          <label>Temperature (°C)</label>
          <input value={env.temperature_C} onChange={e => setEnv({...env, temperature_C: num(e.target.value)})} />
          <label>Humidity (0–1)</label>
          <input value={env.relativeHumidity} onChange={e => setEnv({...env, relativeHumidity: num(e.target.value)})} />
          <label>Wind speed (mph)</label>
          <input value={(env.windSpeed_ms/(0.44704)).toFixed(1)} onChange={e => setEnv({...env, windSpeed_ms: num(e.target.value)*0.44704})} />
          <label>Wind direction (° from)</label>
          <input value={env.windDirection_deg} onChange={e => setEnv({...env, windDirection_deg: num(e.target.value)})} />
          <label>Incline (°)</label>
          <input value={env.incline_deg} onChange={e => setEnv({...env, incline_deg: num(e.target.value)})} />
        </section>
      </div>

      <div className="row" style={{margin:'16px 0'}}>
        <button onClick={()=>setUnits(u=>u==='MIL'?'MOA':'MIL')}>Units: {units}</button>
        <button className="secondary" onClick={()=>setOpts({...opts, maxRange_m: 1000})}>1K m</button>
        <button className="secondary" onClick={()=>setOpts({...opts, maxRange_m: 1500})}>1.5K m</button>
      </div>

      <section className="card">
        <h2>DOPE Table <span className="muted">({units})</span></h2>
        <table>
          <thead>
            <tr>
              <th style={{textAlign:'left'}}>Range (m)</th>
              <th>Drop (cm)</th>
              <th>{units}</th>
              <th>TOF (s)</th>
              <th>Vel (m/s)</th>
              <th>Energy (J)</th>
            </tr>
          </thead>
          <tbody>
  {samples
    .filter(s => s.range_m % 50 === 0) // exact 0,50,100... from solver
    .map(s => {
      const clicks = units === 'MIL' ? s.mil : s.moa;
      return (
        <tr key={s.range_m}>
          <td style={{ textAlign: 'left' }}>{s.range_m.toFixed(0)}</td>
          <td>{(s.drop_m * 100).toFixed(1)}</td>
          <td>{clicks.toFixed(2)}</td>
          <td>{s.tof_s.toFixed(3)}</td>
          <td>{s.vel_ms.toFixed(1)}</td>
          <td>{s.energy_J.toFixed(0)}</td>
        </tr>
      );
    })}
</tbody>


        </table>
        <p className="muted" style={{marginTop:8}}>Note: Drag tables are compact approximations. For match-grade results, replace with full G1/G7 data.</p>
      </section>
    </div>
  )
}
