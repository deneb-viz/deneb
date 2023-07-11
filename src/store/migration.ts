import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';
import {
    IVersionComparator,
    IVersionInformation,
    TVersionChange
} from '../core/utils/versioning';
import { ModalDialogRole } from '../features/modal-dialog/types';

export interface IMigrationSliceProperties extends IVersionComparator {
    changeType: TVersionChange;
    showMigrationDialog: boolean;
    clearMigrationDialog: () => void;
    updateMigrationDetails: (
        payload: IMigrationSliceUpdateMigrationDetailsPayload
    ) => void;
}

export interface IMigrationSlice {
    migration: IMigrationSliceProperties;
}

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <IMigrationSlice>{
        migration: {
            current: null,
            previous: null,
            changeType: 'equal',
            showMigrationDialog: false,
            clearMigrationDialog: () =>
                set(
                    (state) => handleClearMigrationDialog(state),
                    false,
                    'migration.clearMigrationDialog'
                ),
            updateMigrationDetails: (payload) =>
                set(
                    (state) => handleUpdateMigrationDetails(state, payload),
                    false,
                    'migration.updateMigrationDetails'
                )
        }
    };

export const createMigrationSlice: StateCreator<
    TStoreState,
    [['zustand/devtools', never]],
    [],
    IMigrationSlice
> = sliceStateInitializer;

interface IMigrationSliceUpdateMigrationDetailsPayload {
    changeType: TVersionChange;
    current: IVersionInformation;
    previous: IVersionInformation;
}

const handleClearMigrationDialog = (
    state: TStoreState
): Partial<TStoreState> => ({
    interface: {
        ...state.interface,
        modalDialogRole: 'None'
    },
    migration: {
        ...state.migration,
        showMigrationDialog: false
    }
});

const handleUpdateMigrationDetails = (
    state: TStoreState,
    payload: IMigrationSliceUpdateMigrationDetailsPayload
): Partial<TStoreState> => {
    const modalDialogRole: ModalDialogRole =
        payload.changeType !== 'equal'
            ? 'Version'
            : state.interface.modalDialogRole;
    return {
        interface: {
            ...state.interface,
            modalDialogRole
        },
        migration: {
            ...state.migration,
            ...payload
        }
    };
};
