import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import { TStoreState } from '.';
import {
    type MigrationSliceUpdateMigrationDetailsPayload,
    type MigrationSlice,
    type ModalDialogRole
} from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<TStoreState>) =>
    <MigrationSlice>{
        migration: {
            current: null,
            previous: null,
            changeType: 'equal',
            migrationCheckPerformed: false,
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
    MigrationSlice
> = sliceStateInitializer;

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
    payload: MigrationSliceUpdateMigrationDetailsPayload
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
            ...payload,
            migrationCheckPerformed: true
        }
    };
};
