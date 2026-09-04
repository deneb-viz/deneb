import type powerbi from 'powerbi-visuals-api';

/**
 * One recorded emission the fake host's event service received. Ordered
 * capture lets scenario tests assert both counts (exactly-once) and
 * sequencing (supersede-before-new-start).
 */
export type FakeEmitterCall =
    | {
          method: 'renderingStarted';
          options: powerbi.extensibility.visual.VisualUpdateOptions;
      }
    | {
          method: 'renderingFinished';
          options: powerbi.extensibility.visual.VisualUpdateOptions;
      }
    | {
          method: 'renderingFailed';
          options: powerbi.extensibility.visual.VisualUpdateOptions;
          reason: string | undefined;
      };

/**
 * Script for the fake host's `fetchMoreData`. Responses are consumed in
 * order, one per call:
 *  - `true`  — host accepted the segment request (an Append will follow
 *    as its own `update()` in a real session; the scenario ships it).
 *  - `false` — host declined (no more segments / limit reached).
 *  - `Error` — host throws synchronously (the documented defensive-path
 *    quirk in `Deneb.handleFetchMore`).
 *
 * When the script is exhausted the fake declines (`false`) — the safest
 * default because it routes the driver into finalise-with-what-we-have
 * rather than an unbounded fetch loop.
 */
export type FetchMoreResponse = boolean | Error;

export type FakeVisualHostConfig = {
    fetchMoreResponses?: FetchMoreResponse[];
};

/**
 * Minimal structural subset of `powerbi.extensibility.visual.IVisualHost`
 * that the update-cycle orchestration touches: the rendering event
 * service (consumed by the rendering-lifecycle coordinator as its
 * emitter) and `fetchMoreData` (consumed by the fetch-more dispatch
 * branch). Everything else on the real host is irrelevant to lifecycle
 * orchestration and intentionally absent, so a scenario that
 * accidentally reaches for another host capability fails loudly at the
 * type level instead of silently exercising an untested seam.
 */
export type FakeVisualHost = {
    eventService: {
        renderingStarted: (
            options: powerbi.extensibility.visual.VisualUpdateOptions
        ) => void;
        renderingFinished: (
            options: powerbi.extensibility.visual.VisualUpdateOptions
        ) => void;
        renderingFailed: (
            options: powerbi.extensibility.visual.VisualUpdateOptions,
            reason?: string
        ) => void;
    };
    fetchMoreData: (aggregateSegments?: boolean) => boolean;
};

export type FakeVisualHostHandle = {
    host: FakeVisualHost;
    /** Ordered record of every rendering* emission the host saw. */
    emitterCalls: FakeEmitterCall[];
    /** Arguments of every `fetchMoreData` call, in order. */
    fetchMoreCalls: Array<{ aggregateSegments: boolean | undefined }>;
    /** Convenience count of emitter calls by method. */
    countEmitterCalls: (method: FakeEmitterCall['method']) => number;
};

/**
 * Build a scripted fake Power BI visual host. The event service records
 * every emission (never throws — host-throw scenarios are covered by
 * the coordinator's own unit suite); `fetchMoreData` consumes the
 * configured response script.
 */
export const createFakeVisualHost = (
    config: FakeVisualHostConfig = {}
): FakeVisualHostHandle => {
    const emitterCalls: FakeEmitterCall[] = [];
    const fetchMoreCalls: Array<{ aggregateSegments: boolean | undefined }> =
        [];
    const responses = [...(config.fetchMoreResponses ?? [])];

    const host: FakeVisualHost = {
        eventService: {
            renderingStarted: (options) => {
                emitterCalls.push({ method: 'renderingStarted', options });
            },
            renderingFinished: (options) => {
                emitterCalls.push({ method: 'renderingFinished', options });
            },
            renderingFailed: (options, reason) => {
                emitterCalls.push({
                    method: 'renderingFailed',
                    options,
                    reason
                });
            }
        },
        fetchMoreData: (aggregateSegments) => {
            fetchMoreCalls.push({ aggregateSegments });
            const next = responses.shift();
            if (next instanceof Error) {
                throw next;
            }
            return next ?? false;
        }
    };

    return {
        host,
        emitterCalls,
        fetchMoreCalls,
        countEmitterCalls: (method) =>
            emitterCalls.filter((c) => c.method === method).length
    };
};
