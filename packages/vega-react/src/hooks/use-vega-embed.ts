import { useRef, useEffect } from 'react';
import vegaEmbed from 'vega-embed';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { logDebug } from '@deneb-viz/utils/logging';
import type { UseVegaEmbedOptions } from '../types';

/**
 * This hook is based directly on the updated `react-vega` implementation, which uses a hook approach, with deep
 * equality comparison to prevent unnecessary re-renders. We need some custom logic around embedding, to manage our
 * dependencies, so this is our own implementation.
 *
 * @param options Configuration for the Vega embed
 *
 * @example
 * ```tsx
 * function VegaEmbed() {
 *   const embedRef = useRef<HTMLDivElement>(null);
 *   const { view, setView } = useVegaView();
 *
 *   const handleEmbed = useCallback((result: { view: View; vgSpec?: object }) => {
 *     setView(result.view);
 *   }, [setView]);
 *
 *   const handleError = useCallback((error: Error) => {
 *     console.error('Vega embed error:', error);
 *     setView(null);
 *   }, [setView]);
 *
 *   useVegaEmbed({
 *     ref: embedRef,
 *     spec: mySpec,
 *     options: myOptions,
 *     onEmbed: handleEmbed,
 *     onError: handleError
 *   });
 *
 *   return <div ref={embedRef} />;
 * }
 * ```
 */
export const useVegaEmbed = ({
    ref,
    spec,
    options = {},
    onEmbed,
    onError
}: UseVegaEmbedOptions) => {
    const embedResultRef = useRef<{ finalize: () => void } | null>(null);
    /**
     * Monotonic token identifying the embed run that is currently allowed to
     * publish its result. Every effect run (and unmount) bumps it and captures
     * the new value; when an asynchronous `vegaEmbed()` settles it compares the
     * generation it captured against the live one. If they differ, a newer
     * respec — or an unmount — has superseded this embed, so it must finalize
     * its own (now-orphaned) view instead of storing it, rebinding the view
     * singleton, or firing callbacks. This makes late-resolving stale embeds
     * safe regardless of the order in which their promises settle.
     */
    const generationRef = useRef(0);

    // Cleanup on unmount: supersede any in-flight embed (so its late
    // resolution finalizes itself and fires no callbacks) and finalize the
    // currently-stored result against the live generation.
    useEffect(() => {
        return () => {
            generationRef.current += 1;
            embedResultRef.current?.finalize();
            embedResultRef.current = null;
        };
    }, []);

    // Embed when spec or options change (deep comparison)
    useDeepCompareEffect(() => {
        // Supersede every prior embed run before doing anything else. A prior
        // embed still in flight will observe that its captured generation is
        // now stale and finalize itself in its own `.then`/`.catch`.
        const generation = (generationRef.current += 1);

        // If spec is null/undefined, clean up previous embed and clear the container
        if (!spec) {
            if (embedResultRef.current) {
                embedResultRef.current.finalize();
                embedResultRef.current = null;
            }
            // Clear the container DOM so stale visuals don't persist
            if (ref.current) {
                ref.current.innerHTML = '';
            }
            return;
        }

        // Container gone (e.g. conditionally unmounted while spec stays set):
        // finalize and clear the stored embed just like the `!spec` branch, so
        // its view/timers/listeners are released instead of leaking.
        if (!ref.current) {
            embedResultRef.current?.finalize();
            embedResultRef.current = null;
            return;
        }

        // Cleanup previous embed
        embedResultRef.current?.finalize();
        embedResultRef.current = null;

        /**
         * It's been observed that when we embed with `actions: false`, this seems to be ignored, unless we spread this
         * in directly at the embed call site. We also need to perform some downstream CSS overrides. This may well be
         * an issue that we should investigate/report for vega-embed when we get a sec.
         */
        vegaEmbed(ref.current, spec, { ...options, actions: false })
            .then((result) => {
                // Stale resolution: a newer respec or an unmount has bumped the
                // generation since this embed started. Finalize the orphaned
                // view immediately so its timers, event listeners and DOM are
                // released, then bail without storing it or firing `onEmbed`.
                if (generation !== generationRef.current) {
                    result.finalize();
                    return;
                }
                embedResultRef.current = result;
                onEmbed?.({ view: result.view, vgSpec: result.vgSpec });
            })
            .catch((error) => {
                // Stale rejection: this embed was superseded, so nobody is
                // waiting on its outcome. Swallow the error rather than
                // reporting a failure for a generation that no longer matters,
                // but leave a debug-level trace so a systematic failure (every
                // respec rejecting) is observable during diagnosis.
                if (generation !== generationRef.current) {
                    logDebug('useVegaEmbed: stale embed rejection suppressed', error);
                    return;
                }
                onError?.(error);
            });
    }, [spec, options]);
};
