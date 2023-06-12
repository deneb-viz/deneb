import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import { TStoreState } from '.';

export interface IInterfaceSlice {
    interface: {
        /**
         * Unique ID representing the current render operation. Used to ensure that
         * we can trigger a re-render of the Vega view for specific conditions that
         * sit outside the obvious triggers (e.g. data changes).
         */
        renderId: string;
        /**
         * Signals that we should generate a new render ID for the current
         * specification.
         */
        generateRenderId: () => void;
    };
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IInterfaceSlice>{
        interface: {
            renderId: uuidv4(),
            generateRenderId: () =>
                set(
                    (state) => handleGenerateRenderId(state),
                    false,
                    'interface.generateRenderId'
                )
        }
    };

export const createInterfaceSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IInterfaceSlice
> = sliceStateInitializer;

/**
 * Sets the rejection state for a cross-filtering operation attempt.
 */
const handleGenerateRenderId = (state: TStoreState): Partial<TStoreState> => ({
    interface: { ...state.interface, renderId: uuidv4() }
});
