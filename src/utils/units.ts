
export const inch = 0.0254;
export const grain = 0.00006479891;
export const fps = 0.3048;
export const yard = 0.9144;

export function toMOA(metersDrop: number, range_m: number){
  return (metersDrop * 3437.74677) / (range_m || 1);
}
export function toMIL(metersDrop: number, range_m: number){
  return (metersDrop * 1000) / (range_m || 1);
}
