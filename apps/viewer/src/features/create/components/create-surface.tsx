import { type ReactElement, type ReactNode, useRef, useState } from 'react';
import type powerbi from 'powerbi-visuals-api';
import { Button } from '@fluentui/react-components';

import { CreateButton, useDenebState } from '@deneb-viz/app-core';
import { persistOnCreateFromTemplate } from '@deneb-viz/powerbi-host';
import { logRender } from '@deneb-viz/utils/logging';
import { openImportDialog } from '../dialog';
import { ImportContent } from './import-content';

type CreateSurfaceProps = {
    host: powerbi.extensibility.visual.IVisualHost;
    /** Renders the landing page, with this surface's import action in it. */
    renderLanding: (importAction: ReactElement) => ReactNode;
};

/**
 * The authoring surface for a visual with fields but no template: the
 * landing page, with an Import button in its import step. The
 * import and placeholder mapping open in a Power BI dialog, so they have
 * room whatever the tile's size. Where Power BI doesn't allow dialogs, the
 * button swaps the tile to the import instead, with Back to return.
 */
export const CreateSurface = ({ host, renderLanding }: CreateSurfaceProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const resetImport = useDenebState((state) => state.create.setMode);
    // The in-tile import's progress: not opened yet, open, or closed by
    // Back (so the Import button takes focus again).
    const [inTileImport, setInTileImport] = useState<
        'unopened' | 'open' | 'closed'
    >('unopened');
    logRender('CreateSurface', inTileImport);
    if (inTileImport === 'open') {
        // Back discards the import in progress, as the dialog's Cancel does.
        const onBack = () => {
            resetImport('import');
            setInTileImport('closed');
        };
        return (
            <ImportContent
                focusFirstControl
                footer={
                    <>
                        <Button onClick={onBack}>
                            {translate('PowerBI_Viewer_Create_Back')}
                        </Button>
                        <CreateButton />
                    </>
                }
            />
        );
    }
    return renderLanding(
        <ImportButton
            host={host}
            autoFocus={inTileImport === 'closed'}
            onImportInTile={() => setInTileImport('open')}
        />
    );
};

type ImportButtonProps = {
    host: powerbi.extensibility.visual.IVisualHost;
    /** Whether the button takes focus when shown, e.g. after Back. */
    autoFocus: boolean;
    onImportInTile: () => void;
};

/**
 * Opens the import dialog, or the in-tile import where Power BI doesn't
 * allow dialogs. Focus comes back to the button when the dialog closes; once
 * a visual is created, the landing page and its button make way for it.
 */
const ImportButton = ({
    host,
    autoFocus,
    onImportInTile
}: ImportButtonProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const onImportInDialog = async () => {
        try {
            await openImportDialog({
                host,
                title: translate('PowerBI_Viewer_Create_Dialog_Title'),
                onCreateProject: persistOnCreateFromTemplate
            });
        } finally {
            buttonRef.current?.focus();
        }
    };
    return (
        <Button
            ref={buttonRef}
            appearance='primary'
            autoFocus={autoFocus}
            onClick={
                host.hostCapabilities?.allowModalDialog
                    ? onImportInDialog
                    : onImportInTile
            }
        >
            {translate('PowerBI_Viewer_Create_Import')}
        </Button>
    );
};
