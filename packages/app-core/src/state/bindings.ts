import { type StateCreator } from 'zustand';
import type {
    BindingsSettings,
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
     * The reader's choice to collapse or expand the pane, or null until
     * they use the toggle. It is cleared when the `collapsible` or the
     * `collapsed` setting changes, so that the settings decide again. Lasts
     * for the session; not persisted.
     */
    paneCollapseChoice: boolean | null;
    /**
     * The `collapsible` and `collapsed` settings of the last spec that
     * compiled, or null before the first. Each compile is compared with
     * them, to tell whether the author has changed either setting.
     */
    lastCollapseSettings: { collapsible: boolean; collapsed: boolean } | null;
    /**
     * Record the value of a bound signal. Holding a value identical to the
     * current one leaves the state untouched, so that a signal listener
     * echoing a control's own write causes no re-render.
     */
    setHeldValue: (name: string, held: HeldBoundValue) => void;
    setPaneCollapseChoice: (isCollapsed: boolean) => void;
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
            paneCollapseChoice: null,
            lastCollapseSettings: null,
            setHeldValue: (name, held) =>
                set(
                    (state) => handleSetHeldValue(state, name, held),
                    false,
                    'bindings.setHeldValue'
                ),
            setPaneCollapseChoice: (paneCollapseChoice) =>
                set(
                    (state) => ({
                        bindings: { ...state.bindings, paneCollapseChoice }
                    }),
                    false,
                    'bindings.setPaneCollapseChoice'
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

/**
 * The bindings state once a spec has compiled with the given `collapsible`
 * and `collapsed` settings. While both stay as they were, the state is
 * returned untouched, whatever the identity of the settings object. A change
 * to either is recorded and clears the reader's collapse choice, so that the
 * settings decide again. The choice is cleared, not just ignored, so that a
 * setting which is changed and then changed back does not bring an old
 * choice back.
 */
export const getBindingsForCollapseSettings = (
    bindings: BindingsSliceProperties,
    settings: Pick<BindingsSettings, 'collapsible' | 'collapsed'>
): BindingsSliceProperties => {
    const { collapsible, collapsed } = settings;
    const last = bindings.lastCollapseSettings;
    const isUnchanged =
        last !== null &&
        last.collapsible === collapsible &&
        last.collapsed === collapsed;
    if (isUnchanged) {
        return bindings;
    }
    return {
        ...bindings,
        lastCollapseSettings: { collapsible, collapsed },
        paneCollapseChoice: null
    };
};
