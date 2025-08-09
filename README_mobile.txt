Mobile-Friendly Changes (Aug 9, 2025)
- Added responsive media queries to index.html:
  - Single-column form layout on small screens
  - Larger tap targets (16px inputs/buttons) to avoid iOS zoom
  - Reduced padding on cards/containers
  - Horizontal scrolling for the results table (min-width: 640px)

- Wrapped the results table in <div className="table-wrap"> for safe horizontal scroll on phones.

How to run:
  npm install
  npm run dev
Build:
  npm run build
