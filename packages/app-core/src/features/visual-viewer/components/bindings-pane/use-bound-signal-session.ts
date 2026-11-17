import { useCallback, useEffect, useRef } from 'react';
import { useVegaView } from '@deneb-viz/vega-react';
import type { BoundSignal } from '@deneb-viz/vega-runtime/spec-processing';
import {
    attachBoundSignals,
    type BoundSignalSession
} from '@deneb-viz/vega-runtime/view';
import { logDebug } from '@deneb-viz/utils/logging';

import { getDenebState } from '../../../../state';

/**
 * Connects the bound signals to the Vega view of this viewer instance, and
 * returns the function a control calls with a new value.
 *
 * Two viewer instances can be mounted at once, and each has its own view
 * context. Only the live instance attaches.
 *
 * A new value is held in the store before it is written to the view. If no
 * view is ready, the write is skipped and the held value is applied when the
 * next view attaches.
 *
 * `boundSignals` must keep its identity between renders, as the parse
 * result's list does. A new array attaches a new session.
 */
export const useBoundSignalSession = (
    boundSignals: BoundSignal[],
    isActive: boolean
) => {
    const { view } = useVegaView();
    const sessionRef = useRef<BoundSignalSession | null>(null);

    useEffect(() => {
        if (!isActive || view === null || boundSignals.length === 0) {
            return undefined;
        }
        const { bindings } = getDenebState();
        const session = attachBoundSignals({
            view,
            boundSignals,
            heldValues: bindings.heldValues,
            onValue: bindings.setHeldValue,
            onError: (error) =>
                logDebug('Bound signal write: the view run failed', { error })
        });
        sessionRef.current = session;
        return () => {
            session.dispose();
            sessionRef.current = null;
        };
    }, [isActive, view, boundSignals]);

    return useCallback((boundSignal: BoundSignal, value: unknown) => {
        const state = getDenebState();
        state.bindings.setHeldValue(boundSignal.name, {
            key: boundSignal.key,
            value
        });
        if (state.compilation.viewReady) {
            sessionRef.current?.write(boundSignal.name, value);
        }
    }, []);
};
