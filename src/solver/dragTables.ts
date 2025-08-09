
export type DragPoint = { v: number; i: number };

export const G1_POINTS: DragPoint[] = [
  { v: 0, i: 0.0 }, { v: 100, i: 0.05 }, { v: 200, i: 0.11 }, { v: 300, i: 0.20 }, { v: 400, i: 0.33 },
  { v: 500, i: 0.50 }, { v: 600, i: 0.72 }, { v: 700, i: 0.98 }, { v: 800, i: 1.28 }, { v: 900, i: 1.60 },
  { v: 1000, i: 1.95 }, { v: 1100, i: 2.30 }, { v: 1200, i: 2.60 }, { v: 1300, i: 2.85 }, { v: 1400, i: 3.05 }
];

export const G7_POINTS: DragPoint[] = [
  { v: 0, i: 0.0 }, { v: 100, i: 0.03 }, { v: 200, i: 0.07 }, { v: 300, i: 0.13 }, { v: 400, i: 0.22 },
  { v: 500, i: 0.34 }, { v: 600, i: 0.49 }, { v: 700, i: 0.67 }, { v: 800, i: 0.88 }, { v: 900, i: 1.12 },
  { v: 1000, i: 1.38 }, { v: 1100, i: 1.65 }, { v: 1200, i: 1.90 }, { v: 1300, i: 2.10 }, { v: 1400, i: 2.25 }
];

export function interp(points: DragPoint[], v: number){
  if (v <= points[0].v) return points[0].i;
  for (let i=1;i<points.length;i++){
    const a = points[i-1], b = points[i];
    if (v <= b.v){
      const t = (v - a.v)/(b.v - a.v);
      return a.i + t*(b.i - a.i);
    }
  }
  const last = points[points.length-1];
  return last.i * (v/last.v);
}
