
# Ballistics Calculator (MVP)

A minimal, local-first ballistics calculator using a point-mass model with RK4 integration and compact G1/G7 drag approximations.

## Quick start

```bash
npm install
npm run dev
```

## Notes

- Physics core is in `src/solver/physics.ts`.
- Drag tables are compact in `src/solver/dragTables.ts`. Swap with full G1/G7 tables for higher accuracy.
- Uses SI internally; the UI shows common units and converts as needed.
