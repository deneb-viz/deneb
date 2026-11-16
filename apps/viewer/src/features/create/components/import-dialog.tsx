import type powerbi from 'powerbi-visuals-api';
import { createRoot } from 'react-dom/client';
import { Button } from '@fluentui/react-components';

import {
    DenebProvider,
    getDenebState,
    type I18nLocale,
    useDenebState
} from '@deneb-viz/app-core';
import { logRender } from '@deneb-viz/utils/logging';
import { I18N_TRANSLATIONS } from '../../../i18n';
import {
    DIALOG_ACTION,
    IMPORT_DIALOG_ID,
    type ImportDialogInitialState,
    type ImportDialogResult
} from '../dialog';
import { ImportContent } from './import-content';

type ImportDialogFooterProps = {
    host: powerbi.extensibility.visual.IDialogHost;
};

/**
 * Cancel, and Create once every placeholder is assigned. Create hands the
 * author's choices back to the visual, which creates the project.
 */
const ImportDialogFooter = ({ host }: ImportDialogFooterProps) => {
    const { metadata, candidates, allAssigned, translate } = useDenebState(
        (state) => ({
            metadata: state.create.metadata,
            candidates: state.create.candidates,
            allAssigned: state.create.metadataAllDependenciesAssigned,
            translate: state.i18n.translate
        })
    );
    const onCreate = () => {
        const result: ImportDialogResult = { metadata, candidates };
        host.close(DIALOG_ACTION.OK, result);
    };
    logRender('ImportDialogFooter');
    return (
        <>
            <Button onClick={() => host.close(DIALOG_ACTION.Cancel)}>
                {translate('PowerBI_Viewer_Create_Dialog_Cancel')}
            </Button>
            <Button
                appearance='primary'
                disabled={!allAssigned}
                onClick={onCreate}
            >
                {translate('Button_Create')}
            </Button>
        </>
    );
};

/**
 * The template import dialog. Power BI constructs it by id in a frame of
 * its own, so it seeds a fresh store with the locale and fields the visual
 * passed in; it has no data view or persistence of its own.
 */
export class ImportDialog {
    static readonly id = IMPORT_DIALOG_ID;

    constructor(
        options: powerbi.extensibility.visual.DialogConstructorOptions,
        initialState: object
    ) {
        const { locale, fields } = initialState as ImportDialogInitialState;
        const { i18n, updateDataset } = getDenebState();
        i18n.setLocale({
            locale: locale as I18nLocale,
            translationExtensions: [I18N_TRANSLATIONS]
        });
        updateDataset({ dataset: { fields, values: [] } });
        // Fill the dialog's frame whatever its page margins, so only the
        // content scrolls and the footer stays put.
        Object.assign(options.element.style, { position: 'fixed', inset: '0' });
        createRoot(options.element).render(
            <DenebProvider>
                <ImportContent
                    footer={<ImportDialogFooter host={options.host} />}
                />
            </DenebProvider>
        );
    }
}

type DialogRegistry = Record<string, typeof ImportDialog>;
const globalWithRegistry = globalThis as typeof globalThis & {
    dialogRegistry?: DialogRegistry;
};
globalWithRegistry.dialogRegistry = globalWithRegistry.dialogRegistry ?? {};
globalWithRegistry.dialogRegistry[ImportDialog.id] = ImportDialog;
