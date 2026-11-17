import { useCallback, useEffect, useRef } from 'react';
import { useVegaView } from '@deneb-viz/vega-react';
import type { BoundSignal } from '@deneb-viz/vega-runtime/spec-processing';
import {
    attachBoundSignals,
    type BoundSignalSession
} from '@deneb-viz/vega-runtime/view';
import { logDebug } from '@deneb-viz/utils/logging';

import { getDenebState } from '../../../../state';
import { getViewBoundSignals } from '../../bindings-embed';

/**
 * Connects the bound signals to the Vega view of this viewer instance, and
 * returns the function a control calls with a new value.
 *
 * Two viewer instances can be mounted at once, and each has its own view
 * context. Only the live instance attaches.
 *
 * The session attaches with the bound signals the view was built from, not
 * those of the latest parse result. After a recompile the view in context
 * is still the old one until the next embed completes, and its values must
 * not be reported under the new definitions.
 *
 * A new value is held in the store before it is written to the view. If no
 * view is ready, the write is skipped: the held value is written to the next
 * view when it is embedded, or when the session attaches to it.
 */
export const useBoundSignalSession = (isActive: boolean) => {
    const { view } = useVegaView();
    const sessionRef = useRef<BoundSignalSession | null>(null);

    useEffect(() => {
        if (!isActive || view === null) {
            return undefined;
        }
        const boundSignals = getViewBoundSignals(view);
        if (boundSignals.length === 0) {
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
    }, [isActive, view]);

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
