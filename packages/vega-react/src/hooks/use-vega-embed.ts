import { useRef, useEffect } from 'react';
import vegaEmbed from 'vega-embed';
import useDeepCompareEffect from 'use-deep-compare-effect';
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
    options,
    onEmbed,
    onError
}: UseVegaEmbedOptions) => {
    const embedResultRef = useRef<{ finalize: () => void } | null>(null);
    const warningsRef = useRef<string[]>([]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            embedResultRef.current?.finalize();
        };
    }, []);

    // Embed when spec or options change (deep comparison)
    useDeepCompareEffect(() => {
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

        if (!ref.current) return;

        // Cleanup previous embed
        embedResultRef.current?.finalize();
        embedResultRef.current = null;

        // Reset warnings
        warningsRef.current = [];

        // Capture console.warn for warnings collection
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
            warningsRef.current.push(args.join(' '));
            originalWarn.apply(console, args);
        };

        /**
         * It's been observed that when we embed with `actions: false`, this seems to be ignored, unless we spread this
         * in directly at the embed call site. We also need to perform some downstream CSS overrides. This may well be
         * an issue that we should investigate/report for vega-embed when we get a sec.
         */
        vegaEmbed(ref.current, spec, { ...options, actions: false })
            .then((result) => {
                embedResultRef.current = result;
                onEmbed?.({ view: result.view, vgSpec: result.vgSpec });
            })
            .catch((error) => {
                onError?.(error);
            })
            .finally(() => {
                // Restore original console.warn
                console.warn = originalWarn;
            });
    }, [spec, options]);
};
