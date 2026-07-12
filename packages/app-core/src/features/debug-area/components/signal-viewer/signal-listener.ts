import { type View } from 'vega';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SignalListenerFn = (name: string, value: any) => void;

export type ActiveSignalListener = {
    signalName: string;
    listener: SignalListenerFn;
} | null;

/**
 * Detach a signal listener from the SPECIFIC view it was registered on. `view`
 * must be the instance captured at effect entry, NOT the live
 * `VegaViewServices.getView()` singleton — after a view replacement the
 * singleton points at the new view (which never had this listener), so
 * detaching against it would leave the listener attached to the old, now
 * garbage-collectable view. Mirrors the data-tab capture-at-entry precedent.
 */
export const detachSignalListener = (
    view: View | null,
    active: ActiveSignalListener
): void => {
    if (!active) return;
    view?.removeSignalListener(active.signalName, active.listener);
};

/**
 * Attach a signal listener to the SPECIFIC view captured at effect entry and
 * return the active-listener record so a later detach can match it by
 * reference.
 */
export const attachSignalListener = (
    view: View | null,
    signalName: string,
    listener: SignalListenerFn
): ActiveSignalListener => {
    view?.addSignalListener(signalName, listener);
    return { signalName, listener };
};
