# `@deneb-viz/eslint-config`

Collection of internal eslint configurations.

- `base.js` — the shared flat config every workspace package extends.
- `boundaries.js` — `createBoundariesConfig({ entry, layers })`, the layered
  dependency matrix shared by the app packages (`app-core`, `editor`). Pass
  the folder layers the package actually has; the matrix is filtered to them.
