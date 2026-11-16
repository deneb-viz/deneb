import type powerbi from 'powerbi-visuals-api';

import {
    createProjectFromTemplate,
    getDenebState,
    type CreateProjectFromTemplateOptions
} from '@deneb-viz/app-core';
import { logWarning } from '@deneb-viz/utils/logging';

/** The id Power BI uses to find the import dialog in `dialogRegistry`. */
export const IMPORT_DIALOG_ID = 'ViewerImportDialog';

/**
 * Numeric values of the `powerbi.DialogAction` members the import dialog
 * uses. Compared directly rather than through the const enum, as in
 * `app/surface.ts`; the `satisfies` clauses fail compilation if the API
 * ever renumbers them.
 */
export const DIALOG_ACTION = {
    OK: 1 satisfies powerbi.DialogAction,
    Cancel: 2 satisfies powerbi.DialogAction
};

/**
 * Centred, with room for the template details and placeholder mapping.
 * The dialog draws its own Cancel and Create buttons, so Create can stay
 * disabled until every placeholder is assigned; Power BI's can't.
 */
export const IMPORT_DIALOG_OPTIONS: Omit<
    powerbi.extensibility.visual.DialogOpenOptions,
    'title'
> = {
    size: { width: 800, height: 720 },
    position: { type: 0 satisfies powerbi.VisualDialogPositionType },
    actionButtons: []
};

type DatasetFields = ReturnType<typeof getDenebState>['dataset']['fields'];

/** What the visual passes to the dialog, which can't read the data view. */
export type ImportDialogInitialState = {
    locale: string;
    fields: DatasetFields;
};

/** The author's choices, returned when they click Create. */
export type ImportDialogResult = Pick<
    CreateProjectFromTemplateOptions,
    'metadata' | 'candidates'
>;

/**
 * The dataset fields the placeholder mapping needs, as plain data. Host
 * metadata stays in the visual: the dialog runs in its own frame, and the
 * visual runs the create step against its own fields.
 */
export const toPortableFields = (fields: DatasetFields): DatasetFields =>
    Object.fromEntries(
        Object.entries(fields).map(
            ([key, { id, role, dataType, description, isSupportField }]) => [
                key,
                { id, role, dataType, description, isSupportField }
            ]
        )
    );

/** Whether a dialog result carries an imported template to create from. */
export const isImportDialogResult = (
    resultState: object | undefined
): resultState is ImportDialogResult => {
    const result = resultState as Partial<ImportDialogResult> | undefined;
    return (
        typeof result?.metadata === 'object' &&
        result.metadata !== null &&
        typeof result.candidates?.spec === 'string'
    );
};

type OpenImportDialogOptions = {
    host: powerbi.extensibility.visual.IVisualHost;
    title: string;
    onCreateProject: CreateProjectFromTemplateOptions['onCreateProject'];
};

/**
 * Opens the import dialog and, when the author clicks Create, creates the
 * project from their choices here in the visual, where the fields and
 * persistence live. Cancelling, or closing the dialog, changes nothing.
 */
export const openImportDialog = async ({
    host,
    title,
    onCreateProject
}: OpenImportDialogOptions) => {
    const initialState: ImportDialogInitialState = {
        locale: host.locale,
        fields: toPortableFields(getDenebState().dataset.fields)
    };
    try {
        const { actionId, resultState } = await host.openModalDialog(
            IMPORT_DIALOG_ID,
            { ...IMPORT_DIALOG_OPTIONS, title },
            initialState
        );
        if (
            actionId !== DIALOG_ACTION.OK ||
            !isImportDialogResult(resultState)
        ) {
            return;
        }
        await createProjectFromTemplate({
            metadata: resultState.metadata,
            candidates: resultState.candidates,
            onCreateProject
        });
    } catch (error) {
        logWarning(
            'Import dialog failed:',
            error instanceof Error ? error.message : String(error)
        );
    }
};
