import {
    type TrackedDrilldownProperties,
    type TrackedFields,
    type TrackedFieldWorkingProperties
} from '@deneb-viz/json-processing/field-tracking';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';

/**
 * Represents the create slice in the visual store.
 */
export type FieldUsageSliceState = {
    fieldUsage: FieldUsageSliceProperties;
};

/**
 * Represents the create slice properties in the visual store.
 */
export type FieldUsageSliceProperties = TrackedFieldWorkingProperties & {
    applyFieldMapping: (payload: FieldUsageSliceApplyFieldMapping) => void;
    applyTokenizationChanges: (
        payload: FieldUsageSliceApplyTokenizationChanges
    ) => void;
    applyTrackingChanges: (
        payload: FieldUsageSliceApplyTrackingChanges
    ) => void;
    setFieldAssignment: (payload: FieldUsageSliceSetFieldAssignment) => void;
};

/**
 * Represents the payload for tokenization changes.
 */
export type FieldUsageSliceApplyTokenizationChanges = {
    tokenizedSpec: string;
};

/**
 * Represents the payload for tracking changes.
 */
export type FieldUsageSliceApplyTrackingChanges = {
    trackedFields: TrackedFields;
    trackedDrilldown: TrackedDrilldownProperties;
    remapFields: UsermetaDatasetField[];
};

/**
 * Represents the payload for field mapping changes.
 */
export type FieldUsageSliceApplyFieldMapping = {
    dataset: TrackedFields;
    drilldown: TrackedDrilldownProperties;
};

/**
 * Represents the payload for a template field assignment.
 */
export type FieldUsageSliceSetFieldAssignment = {
    key: string;
    suppliedObjectKey: string;
    suppliedObjectName: string;
};
