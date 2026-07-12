import { describe, expect, it, vi } from 'vitest';
import {
    attachSignalListener,
    detachSignalListener
} from '../signal-listener';

const makeView = () => ({
    addSignalListener: vi.fn(),
    removeSignalListener: vi.fn()
});

describe('signal listener attach/detach (L4 — capture view at effect entry)', () => {
    it('attaches to the given view and returns the active record', () => {
        const view = makeView();
        const listener = vi.fn();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const active = attachSignalListener(view as any, 'sig', listener);
        expect(view.addSignalListener).toHaveBeenCalledWith('sig', listener);
        expect(active).toEqual({ signalName: 'sig', listener });
    });

    it('detaches from the SAME (captured) view, not a later live one', () => {
        const capturedView = makeView();
        const liveView = makeView(); // the post-replacement singleton
        const listener = vi.fn();
        const active = attachSignalListener(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            capturedView as any,
            'sig',
            listener
        );
        // Cleanup after a view replacement must target the captured view the
        // listener was actually registered on — the L4 guarantee.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        detachSignalListener(capturedView as any, active);
        expect(capturedView.removeSignalListener).toHaveBeenCalledWith(
            'sig',
            listener
        );
        expect(liveView.removeSignalListener).not.toHaveBeenCalled();
    });

    it('is a no-op when there is no active listener', () => {
        const view = makeView();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        detachSignalListener(view as any, null);
        expect(view.removeSignalListener).not.toHaveBeenCalled();
    });

    it('tolerates a null view (view already torn down)', () => {
        const listener = vi.fn();
        expect(() =>
            detachSignalListener(null, { signalName: 'sig', listener })
        ).not.toThrow();
    });
});
