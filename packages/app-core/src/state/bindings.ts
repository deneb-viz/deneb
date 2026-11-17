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
     * The reader's choice to collapse or expand the pane, or null until
     * they use the toggle. It is cleared when the `collapsed` setting
     * changes, so that the setting decides again. Lasts for the session;
     * not persisted.
     */
    paneCollapseChoice: boolean | null;
    /**
     * The `collapsed` setting of the last spec that compiled, or null
     * before the first. Each compile is compared with it, to tell whether
     * the author has changed the setting.
     */
    lastCollapsedSetting: boolean | null;
    /**
     * Record the value of a bound signal. Holding a value identical to the
     * current one leaves the state untouched, so that a signal listener
     * echoing a control's own write causes no re-render.
     */
    setHeldValue: (name: string, held: HeldBoundValue) => void;
    setIsPaneCollapsed: (isPaneCollapsed: boolean) => void;
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
            isPaneCollapsed: false,
            paneCollapseChoice: null,
            lastCollapsedSetting: null,
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
 * The bindings state once a spec has compiled with the given `collapsed`
 * setting. While the setting stays as it was, the state is returned
 * untouched. A changed setting is recorded and clears the reader's collapse
 * choice, so that the setting decides again. The choice is cleared, not
 * just ignored, so that a setting which is changed and then changed back
 * does not bring an old choice back.
 */
export const getBindingsForCollapsedSetting = (
    bindings: BindingsSliceProperties,
    collapsed: boolean
): BindingsSliceProperties =>
    bindings.lastCollapsedSetting === collapsed
        ? bindings
        : {
              ...bindings,
              lastCollapsedSetting: collapsed,
              paneCollapseChoice: null
          };
