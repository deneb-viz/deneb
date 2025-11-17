import { type StateCreator } from 'zustand';

import {
    type VersionChangeDirection,
    type VersionComparator,
    type VersionInformation
} from '@deneb-viz/utils/versioning';
import { type StoreState } from './state';
import { type ModalDialogRole } from '../lib';

export type MigrationSliceProperties = VersionComparator & {
    changeType: VersionChangeDirection;
    migrationCheckPerformed: boolean;
    showMigrationDialog: boolean;
    clearMigrationDialog: () => void;
    updateMigrationDetails: (
        payload: MigrationSliceUpdateMigrationDetailsPayload
    ) => void;
};

export type MigrationSlice = {
    migration: MigrationSliceProperties;
};

export type MigrationSliceUpdateMigrationDetailsPayload = {
    changeType: VersionChangeDirection;
    current: VersionInformation;
    previous: VersionInformation;
};

export const createMigrationSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        MigrationSlice
    > =>
    (set) => ({
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
    });

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
