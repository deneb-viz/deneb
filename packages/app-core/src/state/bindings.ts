import { type StateCreator } from 'zustand';
import type {
    HeldBoundValue,
    HeldBoundValues
} from '@deneb-viz/vega-runtime/spec-processing';

import { type CoreStoreState } from './state';

export type BindingsSliceProperties = {
    /**
     * The last-known value of each bound signal, by signal name. Each entry
     * is tagged with the definition it was captured under, and is ignored
     * once that definition changes. Lasts for the session; not persisted.
     */
    heldValues: HeldBoundValues;
    /**
     * Whether the reader has collapsed the bindings pane. Lasts for the
     * session; not persisted.
     */
    isPaneCollapsed: boolean;
    /**
     * Record the value of a bound signal. Holding a value identical to the
     * current one leaves the state untouched, so that a signal listener
     * echoing a control's own write causes no re-render.
     */
    setHeldValue: (name: string, held: HeldBoundValue) => void;
    setIsPaneCollapsed: (isPaneCollapsed: boolean) => void;
};

export type BindingsSlice = {
    bindings: BindingsSliceProperties;
};

export const createBindingsSlice =
    (): StateCreator<
        CoreStoreState,
        [['zustand/devtools', never]],
        [],
        BindingsSlice
    > =>
    (set) => ({
        bindings: {
            heldValues: {},
            isPaneCollapsed: false,
            setHeldValue: (name, held) =>
                set(
                    (state) => handleSetHeldValue(state, name, held),
                    false,
                    'bindings.setHeldValue'
                ),
            setIsPaneCollapsed: (isPaneCollapsed) =>
                set(
                    (state) => ({
                        bindings: { ...state.bindings, isPaneCollapsed }
                    }),
                    false,
                    'bindings.setIsPaneCollapsed'
                )
        }
    });

const handleSetHeldValue = (
    state: CoreStoreState,
    name: string,
    held: HeldBoundValue
): Partial<CoreStoreState> => {
    const isHeld = Object.prototype.hasOwnProperty.call(
        state.bindings.heldValues,
        name
    );
    const current = isHeld ? state.bindings.heldValues[name] : undefined;
    if (
        current !== undefined &&
        current.key === held.key &&
        Object.is(current.value, held.value)
    ) {
        return state;
    }
    return {
        bindings: {
            ...state.bindings,
            heldValues: { ...state.bindings.heldValues, [name]: held }
        }
    };
};
