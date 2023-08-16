import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import { TStoreState } from '.';
import { ModalDialogRole } from '../features/modal-dialog/types';
import { InterfaceMode } from '../features/interface';

export interface IInterfaceSlice {
    interface: {
        /**
         * Whether the visual has initialized or not. The visual is regarded
         * as initialized once the very first attempt to check the dataset has
         * been made. This is to ensure that we only start to handle mode
         * states beyond `Initializing` after this point (and prevent the UI
         * from flickering between modes during the initial constructor and
         * update events).
         */
        isInitialized: boolean;
        /**
         * The current application mode
         */
        mode: InterfaceMode;
        /**
         * Current modal dialog display role. Used to display correct dialog to
         * the user (or not at all).
         */
        modalDialogRole: ModalDialogRole;
        /**
         * Unique ID representing the current render operation. Used to ensure
         * that we can trigger a re-render of the Vega view for specific
         * conditions that sit outside the obvious triggers (e.g. data
         * changes).
         */
        renderId: string;
        /**
         * Signals that we should generate a new render ID for the current
         * specification.
         */
        generateRenderId: () => void;
        /**
         * For situations where we're not ready to process data (e.g. first
         * run), then we will explicitly flag the visual as initialized and set
         * the mode to `Landing`.
         */
        setExplicitInitialize: () => void;
        /**
         * Sets the role of the modal dialog to display.
         */
        setModalDialogRole: (role: ModalDialogRole) => void;
    };
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IInterfaceSlice>{
        interface: {
            isInitialized: false,
            mode: 'Initializing',
            modalDialogRole: 'None',
            renderId: uuidv4(),
            generateRenderId: () =>
                set(
                    (state) => handleGenerateRenderId(state),
                    false,
                    'interface.generateRenderId'
                ),
            setExplicitInitialize: () =>
                set(
                    (state) => handleSetExplicitInitialize(state),
                    false,
                    'interface.setExplicitInitialize'
                ),
            setModalDialogRole: (role: ModalDialogRole) =>
                set(
                    (state) => handleSetModalDialogRole(state, role),
                    false,
                    'interface.setModalDialogRole'
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

const handleSetModalDialogRole = (
    state: TStoreState,
    role: ModalDialogRole
): Partial<TStoreState> => ({
    interface: { ...state.interface, modalDialogRole: role }
});

/**
 * Explicitly set the visual as initialized and set the mode to `Landing`.
 */
const handleSetExplicitInitialize = (
    state: TStoreState
): TStoreState | Partial<TStoreState> => ({
    interface: {
        ...state.interface,
        isInitialized: true,
        mode: 'Landing'
    }
});
