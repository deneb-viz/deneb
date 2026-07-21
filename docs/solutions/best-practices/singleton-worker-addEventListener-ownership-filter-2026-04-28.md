---
title: "Singleton workers require addEventListener and an ownership filter, not onmessage assignment"
date: 2026-04-28
category: best-practices
module: app-core/debug-area/dataset-viewer
problem_type: best_practice
component: tooling
severity: high
applies_when:
  - A Web Worker (or any event-emitting singleton) is shared across two or more React components
  - Each consumer registers a response handler via property assignment (worker.onmessage = handler)
  - Components can be mounted concurrently or toggled in and out while a job is in flight
  - The request/response protocol already echoes a correlation id (jobId, requestId) in both directions
  - A handler is attached in a useEffect and reads state from closure rather than via a functional updater
tags:
  - web-worker
  - singleton
  - event-listener
  - ownership-filter
  - race-condition
  - react
  - useeffect
  - functional-updater
related_components:
  - app-core/debug-area/workers/index.ts
  - app-core/debug-area/dataset-viewer/source-tab.tsx
  - app-core/debug-area/dataset-viewer/data-tab.tsx
---

# Singleton workers require addEventListener and an ownership filter, not onmessage assignment

## Context

`datasetViewerWorker` (`packages/app-core/src/features/debug-area/workers/index.ts`) is a module-level singleton — one instance for the lifetime of the module. Two React components consumed it: `SourceTab` and `DataTab` (both under `packages/app-core/src/features/debug-area/components/dataset-viewer/`). Both registered their response handlers via property assignment:

```typescript
// SourceTab — pre-fix
worker.onmessage = handler;

// DataTab — pre-fix (mounted second; silently clobbers SourceTab's handler)
datasetWorker.onmessage = handler;
```

`onmessage` is a single property. The second assignment wins and the first handler is silently dropped with no warning. When both tabs were mounted — or when one mounted while the other still had a job in flight — one component stopped receiving responses entirely. A four-reviewer `/ce:review` pass flagged it convergently at P1 with confidence 0.78–0.92.

A secondary bug surfaced during the fix: `DataTab`'s handler closed over `datasetState.jobQueue` at mount time (empty array), so `jobQueue.includes(jobId)` always returned `false`, `complete` was always `true`, and the processing spinner cleared prematurely on partial results.

## Guidance

**Never configure a shared singleton via property-assignment handlers.** Use `addEventListener` and pair it with an ownership filter to route each response to the tab that owns it.

**Step 1 — switch to `addEventListener` with cleanup:**

```typescript
useEffect(() => {
    if (!window.Worker) return;
    const handler = (e: MessageEvent) => { /* ... */ };
    worker.addEventListener('message', handler);
    return () => {
        worker.removeEventListener('message', handler);
    };
}, [worker]);
```

Both tabs now coexist. Each mounts its own listener; unmounting removes only that listener.

**Step 2 — add an ownership filter inside a functional updater:**

Each tab tracks its in-flight jobs in `jobQueue` state. The handler uses `setTableState((prev) => ...)` and checks membership before processing:

```typescript
const handler = (e: MessageEvent) => {
    const { jobId, values: rows, maxWidths } = e.data;
    setTableState((prev) => {
        // Ignore responses that belong to the other tab's jobs.
        if (!prev.jobQueue.includes(jobId)) {
            return prev;
        }
        const newQueue = prev.jobQueue.filter((id) => id !== jobId);
        return {
            columns: buildDatasetViewerColumns(rows, maxWidths),
            jobQueue: newQueue,
            processing: newQueue.length > 0,
            rows
        };
    });
};
```

The functional-updater form (`(prev) => ...`) also fixes the stale-closure bug: `prev.jobQueue` is the live queue at response time, not the empty array captured when the effect mounted.

## Why This Matters

**Property assignment is last-writer-wins.** `EventTarget.onmessage` is a settable property backed by a single slot. There is no warning when it is overwritten, no automatic cleanup of the displaced handler, and no way for the first component to detect the clobber. The symptom is silent: responses arrive but only one component reacts; the other stops updating without an error.

**The ownership filter prevents cross-talk.** The worker protocol already echoes `jobId` in both `IWorkerDatasetViewerMessage` (request) and `IWorkerDatasetViewerResponse` (response). The filter costs one `Array.includes` call per response — no protocol changes needed.

**Functional updaters fix stale closures as a side effect.** A handler attached once in a `useEffect` closes over the state at mount time. If that state is the initial empty `jobQueue`, every `includes` check returns `false`. Reading `prev` from the updater argument sidesteps this entirely: React passes the current committed state, not the closure snapshot.

## When to Apply

- Any time a singleton resource (Worker, WebSocket, EventEmitter) is shared across multiple React component instances.
- Any time two `useEffect` hooks write to the same `.onX` property on the same object.
- When a handler is attached in a `useEffect` with an empty or stable dep array — check whether any state it reads is from mount-time closure.
- During review: treat `singleton.onmessage = handler` (or any `singleton.onX = handler`) inside a React component as a structural smell requiring justification.

## Examples

**Before — both tabs use property assignment (last writer wins):**

```typescript
// packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx
// BEFORE (removed)
useEffect(() => {
    if (!window.Worker) return;
    worker.onmessage = (e: MessageEvent) => {
        const { jobId, values: rows, maxWidths } = e.data;
        const newQueue = tableState.jobQueue.filter((id) => id !== jobId); // ← stale closure
        const complete = newQueue.length === 0;
        setTableState({ columns: buildDatasetViewerColumns(rows, maxWidths), jobQueue: newQueue, processing: !complete, rows });
    };
}, [worker]);

// packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx
// BEFORE (removed) — clobbers SourceTab's handler when DataTab mounts second
useEffect(() => {
    if (!window.Worker) return;
    datasetWorker.onmessage = (e: MessageEvent) => {
        const { jobId, values, maxWidths } = e.data;
        const newJobQueue = datasetState.jobQueue.filter((id) => id !== jobId); // ← stale closure (captured [] at mount)
        const complete = newJobQueue.length === 0;                              // always true → clears spinner early
        setDatasetState({ columns: buildDatasetViewerColumns(values, maxWidths), jobQueue: newJobQueue, processing: !complete, values });
    };
}, []);
```

**After — `addEventListener` with ownership filter and functional updater (both tabs, same pattern):**

```typescript
// packages/app-core/src/features/debug-area/components/dataset-viewer/source-tab.tsx
// packages/app-core/src/features/debug-area/components/dataset-viewer/data-tab.tsx
useEffect(() => {
    if (!window.Worker) return;
    const handler = (e: MessageEvent) => {
        const { jobId, values: rows, maxWidths } = e.data;
        setTableState((prev) => {
            if (!prev.jobQueue.includes(jobId)) return prev;   // ownership filter
            const newQueue = prev.jobQueue.filter((id) => id !== jobId);
            return {
                columns: buildDatasetViewerColumns(rows, maxWidths),
                jobQueue: newQueue,
                processing: newQueue.length > 0,
                rows
            };
        });
    };
    worker.addEventListener('message', handler);
    return () => {
        worker.removeEventListener('message', handler);
    };
}, [worker]);
```

**Side effect — stale-closure bug eliminated:** In the before code, `DataTab`'s handler captured `datasetState.jobQueue` (empty `[]` at mount) in its closure. `[].filter(...)` always produced `[]`; `complete` was always `true`; the worker spinner cleared after the first response even when more jobs were queued. The functional-updater `(prev) => ...` reads the live queue and fixes this without any additional change.

## Related

- [`docs/solutions/best-practices/pure-setstate-updaters-no-dom-side-effects-2026-04-21.md`](pure-setstate-updaters-no-dom-side-effects-2026-04-21.md) — functional updaters; the ownership filter relies on this pattern to read live state rather than closure state.
- [`docs/solutions/best-practices/lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — co-discovered learning from the same review cycle; both are about ownership and identity in shared resources.
