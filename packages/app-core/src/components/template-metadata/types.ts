import { type CreateSliceSetFieldAssignment } from '../../state/create';

/**
 * Reducer for a template dataset field assignment, injected by the caller
 * that renders the dataset table (the create path passes
 * `state.create.setFieldAssignment`; the editor's export/mapping path
 * passes `state.fieldUsage.setFieldAssignment`) instead of being resolved
 * internally from `dialogType`. `state.fieldUsage.setFieldAssignment`'s
 * payload type (`FieldUsageSliceSetFieldAssignment` in
 * `state/field-usage.ts`) is structurally identical to
 * `CreateSliceSetFieldAssignment`, so both callers satisfy this reducer
 * shape.
 */
export type TemplateFieldAssignmentReducer = (
    payload: CreateSliceSetFieldAssignment
) => void;
