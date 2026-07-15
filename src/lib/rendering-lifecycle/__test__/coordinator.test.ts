import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createRenderingLifecycleCoordinator } from '../coordinator';
import {
    SUPERSEDED_FAILURE_REASON,
    type RenderingLifecycleCoordinatorTestSurface,
    type RenderingLifecycleEmitter,
    type RenderingLifecycleEvent,
    type RenderingLifecycleObserver,
    type SafetyNetHandle,
    type SafetyNetScheduler
} from '../types';

// ─── Test harness ────────────────────────────────────────────────────────────
//
// The coordinator's public API is structurally typed; the harness wires it to
// recordable mocks for the three injected dependencies (emitter, scheduler,
// observer). Tests inspect:
//
//  - `calls`: ordered host-emission record (proves what the host saw and in
//    what order — important for supersede ordering and the "loud throws" path).
//  - `events`: ordered observer record (proves what the dev overlay / U11
//    surface would see, including failure reasons and via-discriminators).
//  - `tick()`: invokes the single pending safety-net callback (the scheduler
//    only ever holds one because each `armSafetyNet` is per-id and `close` /
//    `fail` cancel before the tick can fire in real time).
//
// `emitterThrowsOn` lets a test simulate a host that throws on a specific
// emission. The `afterCalls` field skips the first N matching calls before
// throwing, so the supersede-throws-on-failed test can let the original
// `renderingStarted` succeed but force the supersede `renderingFailed` to
// throw.

type EmitterCall =
    | { method: 'renderingStarted'; options: unknown }
    | { method: 'renderingFinished'; options: unknown }
    | {
          method: 'renderingFailed';
          options: unknown;
          reason: string | undefined;
      };

type EmitterThrowSpec = {
    method: 'renderingStarted' | 'renderingFinished' | 'renderingFailed';
    afterCalls?: number;
    error?: Error;
};

const FAKE_OPTIONS_A = { __label: 'A' } as never;
const FAKE_OPTIONS_B = { __label: 'B' } as never;
const FAKE_OPTIONS_C = { __label: 'C' } as never;

const buildHarness = (config?: { emitterThrowsOn?: EmitterThrowSpec }) => {
    const calls: EmitterCall[] = [];
    const events: RenderingLifecycleEvent[] = [];
    let pendingTick: (() => void) | null = null;

    const maybeThrow = (
        method: EmitterCall['method'],
        matchingCallCount: number
    ) => {
        const spec = config?.emitterThrowsOn;
        if (!spec || spec.method !== method) return;
        if ((spec.afterCalls ?? 0) > matchingCallCount) return;
        throw spec.error ?? new Error(`emitter threw on ${method}`);
    };

    const countMatching = (method: EmitterCall['method']) =>
        calls.filter((c) => c.method === method).length;

    const emitter: RenderingLifecycleEmitter = {
        renderingStarted: (options) => {
            const before = countMatching('renderingStarted');
            maybeThrow('renderingStarted', before);
            calls.push({ method: 'renderingStarted', options });
        },
        renderingFinished: (options) => {
            const before = countMatching('renderingFinished');
            maybeThrow('renderingFinished', before);
            calls.push({ method: 'renderingFinished', options });
        },
        renderingFailed: (options, reason) => {
            const before = countMatching('renderingFailed');
            maybeThrow('renderingFailed', before);
            calls.push({ method: 'renderingFailed', options, reason });
        }
    };

    const scheduler: SafetyNetScheduler = {
        schedule: (callback) => {
            pendingTick = callback;
            const handle: SafetyNetHandle = {
                cancel: () => {
                    if (pendingTick === callback) pendingTick = null;
                }
            };
            return handle;
        }
    };

    const observer: RenderingLifecycleObserver = (event) => {
        events.push(event);
    };

    const coordinator: RenderingLifecycleCoordinatorTestSurface =
        createRenderingLifecycleCoordinator({
            emitter,
            scheduler,
            observer
        });

    const tick = () => {
        const cb = pendingTick;
        pendingTick = null;
        cb?.();
    };

    return { coordinator, calls, events, tick };
};

// ─── Coordinator ──────────────────────────────────────────────────────────────

describe('createRenderingLifecycleCoordinator — happy path', () => {
    it('open then closeCurrent emits exactly one started + one finished', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.closeCurrent();
        expect(calls).toEqual([
            { method: 'renderingStarted', options: FAKE_OPTIONS_A },
            { method: 'renderingFinished', options: FAKE_OPTIONS_A }
        ]);
    });

    it('open then failCurrent emits exactly one started + one failed', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.failCurrent(new Error('boom'));
        expect(calls.map((c) => c.method)).toEqual([
            'renderingStarted',
            'renderingFailed'
        ]);
        expect(calls.find((c) => c.method === 'renderingFailed')?.reason).toBe(
            'boom'
        );
    });

    it('observer sees opened then closed with via=sync-current', () => {
        const { coordinator, events } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.closeCurrent();
        expect(events.map((e) => e.kind)).toEqual(['opened', 'closed']);
        const closed = events.find((e) => e.kind === 'closed');
        expect(closed && 'via' in closed && closed.via).toBe('sync-current');
    });
});

describe('createRenderingLifecycleCoordinator — exactly-once guards', () => {
    it('closeCurrent twice → second ignored; one renderingFinished emitted', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.closeCurrent();
        coordinator.closeCurrent();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
    });

    it('closeCurrent then failCurrent → fail ignored (already closed)', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.closeCurrent();
        coordinator.failCurrent(new Error('after close'));
        expect(
            calls.filter((c) => c.method === 'renderingFailed')
        ).toHaveLength(0);
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
    });

    it('failCurrent then closeCurrent → close ignored (already closed)', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.failCurrent(new Error('boom'));
        coordinator.closeCurrent();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(0);
        expect(
            calls.filter((c) => c.method === 'renderingFailed')
        ).toHaveLength(1);
    });
});

describe('createRenderingLifecycleCoordinator — pending-render no-ops', () => {
    it('closePendingRender with no pending bound → no host emission, no observer event', () => {
        const { coordinator, calls, events } = buildHarness();
        coordinator.closePendingRender();
        expect(calls).toEqual([]);
        expect(events).toEqual([]);
    });

    it('failPendingRender with no pending bound → no host emission, no observer event', () => {
        const { coordinator, calls, events } = buildHarness();
        coordinator.failPendingRender(new Error('phantom'));
        expect(calls).toEqual([]);
        expect(events).toEqual([]);
    });

    it('markPendingRenderStarted with no pending bound → no host emission, no observer event', () => {
        const { coordinator, calls, events } = buildHarness();
        coordinator.markPendingRenderStarted();
        expect(calls).toEqual([]);
        expect(events).toEqual([]);
    });
});

describe('createRenderingLifecycleCoordinator — open throws gracefully', () => {
    it('host throws on renderingStarted → open propagates throw; failCurrent finds no open id and no-ops; no orphan recorded', () => {
        const { coordinator, calls } = buildHarness({
            emitterThrowsOn: { method: 'renderingStarted' }
        });
        expect(() => coordinator.open(FAKE_OPTIONS_A)).toThrow();
        // No id was minted (open threw before recording the id in the
        // openIds map), so failCurrent has nothing to act on.
        coordinator.failCurrent(new Error('catch handler'));
        expect(
            calls.filter((c) => c.method === 'renderingFailed')
        ).toHaveLength(0);
    });
});

describe('createRenderingLifecycleCoordinator — supersede', () => {
    it('open(B) while A is still open → host sees started(A), failed(A, superseded), started(B) in order', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.open(FAKE_OPTIONS_B);
        expect(calls).toEqual([
            { method: 'renderingStarted', options: FAKE_OPTIONS_A },
            {
                method: 'renderingFailed',
                options: FAKE_OPTIONS_A,
                reason: SUPERSEDED_FAILURE_REASON
            },
            { method: 'renderingStarted', options: FAKE_OPTIONS_B }
        ]);
    });

    it('superseded A is fully closed (closed=true) before B opens — closing A afterward is a no-op', () => {
        const { coordinator, calls } = buildHarness();
        const idA = coordinator.open(FAKE_OPTIONS_A);
        coordinator.open(FAKE_OPTIONS_B);
        coordinator.close(idA);
        // The supersede already emitted renderingFailed(A). A subsequent
        // explicit close on A must NOT emit renderingFinished(A) — A is
        // terminally closed.
        expect(
            calls.filter(
                (c) =>
                    c.method === 'renderingFinished' &&
                    c.options === FAKE_OPTIONS_A
            )
        ).toHaveLength(0);
    });

    it('observer sees failed with via=superseded for the displaced id', () => {
        const { coordinator, events } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.open(FAKE_OPTIONS_B);
        const failed = events.find((e) => e.kind === 'failed');
        expect(failed && 'via' in failed && failed.via).toBe('superseded');
        expect(failed && 'reason' in failed && failed.reason).toBe(
            SUPERSEDED_FAILURE_REASON
        );
    });

    it('host throws on supersede renderingFailed → throw propagates loudly; A marked closed; B never minted', () => {
        const { coordinator, calls, events } = buildHarness({
            emitterThrowsOn: { method: 'renderingFailed' }
        });
        const idA = coordinator.open(FAKE_OPTIONS_A);
        expect(() => coordinator.open(FAKE_OPTIONS_B)).toThrow();
        // A's terminal-attempt was made (host saw the call site) even
        // though the host's response was to throw. A is marked closed
        // BEFORE the host call, so a re-close on idA is a no-op.
        coordinator.close(idA);
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(0);
        // B was never minted — the catch in update() will call
        // failCurrent which should find A still as "currently open" no
        // (A is closed) and... actually nothing to act on. Verify no
        // started(B) was emitted before the supersede throw.
        expect(
            calls.filter(
                (c) =>
                    c.method === 'renderingStarted' &&
                    c.options === FAKE_OPTIONS_B
            )
        ).toHaveLength(0);
        // Observer recorded the supersede attempt even though the host
        // threw — the closed/failed transition is locked in before the
        // host call.
        expect(events.some((e) => e.kind === 'failed')).toBe(true);
    });
});

describe('createRenderingLifecycleCoordinator — pending-render binding', () => {
    it('rebinds atomically across consecutive opens: bindPendingRender(B) replaces bindPendingRender(A)', () => {
        const { coordinator, calls } = buildHarness();
        const idA = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(idA);
        const idB = coordinator.open(FAKE_OPTIONS_B);
        coordinator.bindPendingRender(idB);
        coordinator.closePendingRender();
        // closePendingRender should close B (the most-recently-bound),
        // not A (already supersede-failed). One renderingFinished, and
        // it targets B's options.
        const finishes = calls.filter((c) => c.method === 'renderingFinished');
        expect(finishes).toHaveLength(1);
        expect(finishes[0].options).toBe(FAKE_OPTIONS_B);
    });

    it('stale pending-render callback after supersede no-ops against the already-closed id', () => {
        const { coordinator, calls } = buildHarness();
        const idA = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(idA);
        // B opens before A's render arrives — A is supersede-failed.
        coordinator.open(FAKE_OPTIONS_B);
        // A's late embed callback arrives BEFORE B is bindPendingRender'd.
        // The pending-render id is still A (a closed id); closePendingRender
        // is gated by the closed flag, so it no-ops.
        coordinator.closePendingRender();
        const finishes = calls.filter((c) => c.method === 'renderingFinished');
        expect(finishes).toHaveLength(0);
        // B now binds and its own close lands cleanly.
        // (Skipped here — covered by the previous test.)
    });

    it('markPendingRenderStarted twice for same pending id → idempotent; host sees no second renderingStarted', () => {
        const { coordinator, calls, events } = buildHarness();
        const idA = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(idA);
        coordinator.markPendingRenderStarted();
        coordinator.markPendingRenderStarted();
        expect(
            calls.filter((c) => c.method === 'renderingStarted')
        ).toHaveLength(1);
        // Observer logs render-started only once.
        expect(events.filter((e) => e.kind === 'render-started')).toHaveLength(
            1
        );
    });

    it('bindPendingRenderCurrent targets the current open id (no-arg variant for dispatch handlers)', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        // Dispatch handler does not have direct access to the minted
        // id — uses the no-arg variant to bind whichever id is open.
        coordinator.bindPendingRenderCurrent();
        coordinator.closePendingRender();
        const finishes = calls.filter((c) => c.method === 'renderingFinished');
        expect(finishes).toHaveLength(1);
        expect(finishes[0].options).toBe(FAKE_OPTIONS_A);
    });

    it('bindPendingRenderCurrent with no current open id → no-op', () => {
        const { coordinator, calls, events } = buildHarness();
        // No prior open; the dispatch handler's call should not raise
        // or bind anything stale.
        coordinator.bindPendingRenderCurrent();
        coordinator.closePendingRender();
        expect(calls).toEqual([]);
        expect(events).toEqual([]);
    });

    it('bindPendingRenderCurrent after supersede rebinds to the new id', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRenderCurrent();
        // Supersede A with B; the dispatch handler for B's update
        // calls bindPendingRenderCurrent again — should retarget to B.
        coordinator.open(FAKE_OPTIONS_B);
        coordinator.bindPendingRenderCurrent();
        coordinator.closePendingRender();
        const finishes = calls.filter((c) => c.method === 'renderingFinished');
        expect(finishes).toHaveLength(1);
        expect(finishes[0].options).toBe(FAKE_OPTIONS_B);
    });

    // ─── In-flight render epoch guard (Important #6) ─────────────────────────
    //
    // A's embed starts (markPendingRenderStarted) → B supersedes A and
    // rebinds the pending slot BEFORE B has started its own render → A's
    // late in-flight embed fires onRenderingFinished → closePendingRender
    // must NOT terminate B (which has not painted). The render epoch
    // guard recognises the terminal belongs to a render started under a
    // superseded binding and no-ops, recording a `stale-close` event.

    it('stale in-flight embed close after supersede+rebind no-ops against the freshly-bound id', () => {
        const { coordinator, calls, events } = buildHarness();
        const idA = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(idA);
        coordinator.markPendingRenderStarted(); // A's embed render in flight
        // B arrives before A's render finished → A is supersede-failed.
        const idB = coordinator.open(FAKE_OPTIONS_B);
        coordinator.bindPendingRender(idB); // B bound; B's render NOT started
        // A's late in-flight embed fires onRenderingFinished. Without the
        // epoch guard this closes B before it has painted (the defect).
        coordinator.closePendingRender();
        expect(
            calls.filter(
                (c) =>
                    c.method === 'renderingFinished' &&
                    c.options === FAKE_OPTIONS_B
            )
        ).toHaveLength(0);
        // The suppressed terminal is recorded as a stale-close against the
        // freshly-bound id (B) — the id it would have wrongly closed.
        const staleClose = events.find((e) => e.kind === 'stale-close');
        expect(staleClose).toBeDefined();
        expect(staleClose && 'via' in staleClose && staleClose.via).toBe(
            'async-pending-render'
        );
        expect(staleClose && 'id' in staleClose && staleClose.id).toBe(idB);
        // B's own render then starts and completes → exactly one finish
        // targeting B's options.
        coordinator.markPendingRenderStarted();
        coordinator.closePendingRender();
        expect(
            calls.filter(
                (c) =>
                    c.method === 'renderingFinished' &&
                    c.options === FAKE_OPTIONS_B
            )
        ).toHaveLength(1);
    });

    it('stale in-flight embed FAIL after supersede+rebind no-ops against the freshly-bound id', () => {
        const { coordinator, calls, events } = buildHarness();
        const idA = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(idA);
        coordinator.markPendingRenderStarted();
        const idB = coordinator.open(FAKE_OPTIONS_B);
        coordinator.bindPendingRender(idB);
        // A's late embed error must not FAIL B.
        coordinator.failPendingRender(new Error('A late embed error'));
        expect(
            calls.filter(
                (c) =>
                    c.method === 'renderingFailed' &&
                    c.options === FAKE_OPTIONS_B
            )
        ).toHaveLength(0);
        const staleClose = events.find((e) => e.kind === 'stale-close');
        expect(staleClose).toBeDefined();
        expect(staleClose && 'id' in staleClose && staleClose.id).toBe(idB);
        // B's own render then fails cleanly → exactly one renderingFailed
        // targeting B's options.
        coordinator.markPendingRenderStarted();
        coordinator.failPendingRender(new Error('B real error'));
        expect(
            calls.filter(
                (c) =>
                    c.method === 'renderingFailed' &&
                    c.options === FAKE_OPTIONS_B
            )
        ).toHaveLength(1);
    });

    it('renderless pending close (no render started, inFlightEpoch null) closes normally with no stale-close', () => {
        const { coordinator, calls, events } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(id);
        // markPendingRenderStarted never fires → inFlightEpoch stays null
        // → the epoch guard is inert and the close lands exactly as before.
        coordinator.closePendingRender();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
        expect(events.some((e) => e.kind === 'stale-close')).toBe(false);
    });
});

describe('createRenderingLifecycleCoordinator — safety-net', () => {
    it('open + armSafetyNet + tick with no render started → safety-net closes orphan; one renderingFinished emitted', () => {
        const { coordinator, calls, tick } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.armSafetyNet(id);
        tick();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
    });

    it('safety-net terminally closes an in-flight render at the bound (started-but-stuck), then a late real close no-ops', () => {
        const { coordinator, calls, tick } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(id);
        coordinator.markPendingRenderStarted();
        coordinator.armSafetyNet(id);
        // The render started but never signalled completion. At the
        // bound the safety-net is the TRUE backstop (U5): it closes the
        // still-open id exactly once rather than deferring forever.
        tick();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
        // A late real close (embed finally resolves after the bound)
        // finds the id already deleted and no-ops — exactly-once holds.
        coordinator.closePendingRender();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
    });

    it('closed id is safety-net-inert (close before tick → safety-net no-ops)', () => {
        const { coordinator, calls, tick } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.armSafetyNet(id);
        coordinator.closeCurrent();
        tick();
        // Only the one renderingFinished from closeCurrent; safety-net
        // tick must not emit a second.
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
    });

    it('observer sees safety-net-armed then safety-net-tick with result discriminator', () => {
        const { coordinator, events, tick } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.armSafetyNet(id);
        tick();
        const armed = events.find((e) => e.kind === 'safety-net-armed');
        const ticked = events.find((e) => e.kind === 'safety-net-tick');
        expect(armed).toBeDefined();
        expect(ticked).toBeDefined();
        expect(ticked && 'result' in ticked && ticked.result).toBe('closed');
    });

    it('open with no close, render-started, then tick → safety-net tick reports closed (terminal backstop, no longer deferred)', () => {
        const { coordinator, events, tick } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(id);
        coordinator.markPendingRenderStarted();
        coordinator.armSafetyNet(id);
        tick();
        const ticked = events.find((e) => e.kind === 'safety-net-tick');
        expect(ticked && 'result' in ticked && ticked.result).toBe('closed');
    });

    it('tick after a separate close path resolved → safety-net tick reports inert (already closed)', () => {
        const { coordinator, events, tick } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.armSafetyNet(id);
        coordinator.failCurrent(new Error('boom'));
        // failCurrent should have cancelled the safety-net handle, so
        // tick() here should be a no-op (pendingTick is null).
        tick();
        const ticks = events.filter((e) => e.kind === 'safety-net-tick');
        expect(ticks).toHaveLength(0);
    });
});

describe('createRenderingLifecycleCoordinator — settle-timer close (closePendingRenderSettle)', () => {
    it('no render started → closes terminally like closePendingRender (one renderingFinished, via=async-pending-render)', () => {
        const { coordinator, calls, events } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(id);
        // renderStarted is false (markPendingRenderStarted never fired)
        // — the non-Vega-affecting formatting-change case this settle
        // path targets. It closes exactly as the real pending close.
        coordinator.closePendingRenderSettle();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
        const closed = events.find((e) => e.kind === 'closed');
        expect(closed && 'via' in closed && closed.via).toBe(
            'async-pending-render'
        );
    });

    it('render already started → DEFERS (no emission, id stays open); the later real close then lands exactly once', () => {
        const { coordinator, calls } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(id);
        coordinator.markPendingRenderStarted();
        // Settle timer fires WHILE the render is in flight — must NOT
        // emit renderingFinished mid-render (H2).
        coordinator.closePendingRenderSettle();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(0);
        // The embed's own real render-complete close terminates it.
        coordinator.closePendingRender();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
    });

    it('deferred settle emits no observer event (start-vs-close tally must not count it)', () => {
        const { coordinator, events } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(id);
        coordinator.markPendingRenderStarted();
        const eventCountBefore = events.length;
        coordinator.closePendingRenderSettle();
        expect(events.length).toBe(eventCountBefore);
    });

    it('no pending-render bound → no-op (no host emission, no observer event)', () => {
        const { coordinator, calls, events } = buildHarness();
        coordinator.closePendingRenderSettle();
        expect(calls).toEqual([]);
        expect(events).toEqual([]);
    });

    it('already-closed pending id → no-op via exactly-once guard', () => {
        const { coordinator, calls } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(id);
        // Real close deletes the id from the map first.
        coordinator.closePendingRender();
        // A settle timer firing afterward finds nothing and no-ops.
        coordinator.closePendingRenderSettle();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
    });

    it('terminal settle close cancels the armed safety-net (no second terminal on a later tick)', () => {
        const { coordinator, calls, tick } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.bindPendingRender(id);
        coordinator.armSafetyNet(id);
        // No render started → settle closes terminally; closeInternal
        // must cancel the armed safety-net handle.
        coordinator.closePendingRenderSettle();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
        tick();
        expect(
            calls.filter((c) => c.method === 'renderingFinished')
        ).toHaveLength(1);
    });
});

describe('createRenderingLifecycleCoordinator — id-bearing variants (test surface)', () => {
    it('explicit close(id) closes that id; close(differentId) no-ops', () => {
        const { coordinator, calls } = buildHarness();
        const idA = coordinator.open(FAKE_OPTIONS_A);
        // Open B (which supersede-fails A), then re-close idA explicitly.
        coordinator.open(FAKE_OPTIONS_B);
        coordinator.close(idA);
        // idA already closed via supersede; no second emission.
        expect(
            calls.filter(
                (c) =>
                    c.method === 'renderingFinished' &&
                    c.options === FAKE_OPTIONS_A
            )
        ).toHaveLength(0);
    });

    it('explicit markRenderStarted(id) for a closed id no-ops', () => {
        const { coordinator, calls } = buildHarness();
        const id = coordinator.open(FAKE_OPTIONS_A);
        coordinator.close(id);
        coordinator.markRenderStarted(id);
        // Only the initial renderingStarted; no second from markRenderStarted.
        expect(
            calls.filter((c) => c.method === 'renderingStarted')
        ).toHaveLength(1);
    });
});

describe('createRenderingLifecycleCoordinator — observer is optional', () => {
    it('coordinator runs without an observer; calls still emitted', () => {
        const calls: EmitterCall[] = [];
        const emitter: RenderingLifecycleEmitter = {
            renderingStarted: (options) =>
                calls.push({ method: 'renderingStarted', options }),
            renderingFinished: (options) =>
                calls.push({ method: 'renderingFinished', options }),
            renderingFailed: (options, reason) =>
                calls.push({ method: 'renderingFailed', options, reason })
        };
        const scheduler: SafetyNetScheduler = {
            schedule: () => ({ cancel: () => undefined })
        };
        const coordinator = createRenderingLifecycleCoordinator({
            emitter,
            scheduler
        });
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.closeCurrent();
        expect(calls.map((c) => c.method)).toEqual([
            'renderingStarted',
            'renderingFinished'
        ]);
    });
});

describe('createRenderingLifecycleCoordinator — error-to-reason derivation', () => {
    it('Error instance → reason is the error message', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.failCurrent(new Error('something broke'));
        const failed = calls.find((c) => c.method === 'renderingFailed');
        expect(failed?.reason).toBe('something broke');
    });

    it('non-Error value → reason is String(value)', () => {
        const { coordinator, calls } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        coordinator.failCurrent('plain string');
        const failed = calls.find((c) => c.method === 'renderingFailed');
        expect(failed?.reason).toBe('plain string');
    });

    it('observer carries the original error value alongside the reason string', () => {
        const { coordinator, events } = buildHarness();
        coordinator.open(FAKE_OPTIONS_A);
        const err = new Error('boom');
        coordinator.failCurrent(err);
        const failed = events.find((e) => e.kind === 'failed');
        expect(failed && 'error' in failed && failed.error).toBe(err);
    });
});

// Silence the "no useless mocks" warning when this file is imported in
// other test files that may reuse the harness.
beforeEach(() => {
    vi.useRealTimers();
});

// Touch unused FAKE_OPTIONS_C so the lint rule for unused vars doesn't fire
// — keeping it available makes future test additions for three-id supersede
// chains a one-line change.
void FAKE_OPTIONS_C;
