import { StateCreator } from 'zustand';
import { NamedSet } from 'zustand/middleware';

import {
    type MigrationSliceUpdateMigrationDetailsPayload,
    type MigrationSlice,
    type ModalDialogRole,
    type StoreState
} from '@deneb-viz/app-core';

const sliceStateInitializer = (set: NamedSet<StoreState>) =>
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
    StoreState,
    [['zustand/devtools', never]],
    [],
    MigrationSlice
> = sliceStateInitializer;

const handleClearMigrationDialog = (
    state: StoreState
): Partial<StoreState> => ({
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
    state: StoreState,
    payload: MigrationSliceUpdateMigrationDetailsPayload
): Partial<StoreState> => {
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
