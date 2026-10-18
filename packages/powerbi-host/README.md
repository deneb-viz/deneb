# @deneb-viz/powerbi-host

The Power BI host layer for Deneb visuals. It is consumed by `apps/deneb`.

## Build

The package is compiled with `tsc` (not `tsdown`) so that const enums from `powerbi-visuals-api` are inlined at compile time. `@deneb-viz/powerbi-compat` is a peer dependency and is never bundled; the visual supplies the single runtime instance.

```bash
npm run build -w @deneb-viz/powerbi-host
npm run test -w @deneb-viz/powerbi-host
```
