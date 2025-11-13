import {
    type VersionChangeDirection,
    type VersionComparator,
    type VersionInformation
} from '@deneb-viz/utils/versioning';

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
