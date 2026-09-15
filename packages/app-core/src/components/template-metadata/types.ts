/**
 * Payload for a template dataset field's assignment to a data-model field.
 * Shared shape between the create slice's and the field-usage slice's
 * `setFieldAssignment` reducers (`CreateSliceSetFieldAssignment` in
 * `state/create.ts`, `FieldUsageSliceSetFieldAssignment` in
 * `state/field-usage.ts`) — duplicated here, rather than imported from
 * either slice, so `template-metadata` (core) does not need to depend on
 * `state/field-usage.ts` (editor-side) for a type.
 */
export type TemplateFieldAssignmentPayload = {
    key: string;
    suppliedObjectKey: string | undefined;
    suppliedObjectName: string | undefined;
};

/**
 * Reducer for a template dataset field assignment, injected by the caller
 * that renders the dataset table (the create path passes
 * `state.create.setFieldAssignment`; the editor's export/mapping path
 * passes `state.fieldUsage.setFieldAssignment`) instead of being resolved
 * internally from `dialogType`. See
 * docs/plans/2026-09-15-001-refactor-editor-package-extraction-plan.md, U6.
 */
export type TemplateFieldAssignmentReducer = (
    payload: TemplateFieldAssignmentPayload
) => void;
