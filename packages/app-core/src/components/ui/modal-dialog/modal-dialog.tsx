import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogProps,
    DialogSurface,
    DialogTitle
} from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../state';
import { useSpecificationEditor } from '../../../features/specification-editor';
import { useModalDialogStyles } from './styles';
import {
    handleCloseCreateDialog,
    handleSetFocusToActiveEditor,
    ModalDialogRole
} from '../../../lib';
import {
    CreateButton,
    VisualCreatePane
} from '../../../features/project-create';
import { ExportButtons, ExportPane } from '../../../features/project-export';
import { VersionChangeContent } from './version-change-content';

export const ModalDialog = () => {
    const {
        exportProcessingState,
        modalDialogRole,
        clearMigrationDialog,
        setExportProcessingState,
        setModalDialogRole,
        translate
    } = useDenebState((state) => ({
        exportProcessingState: state.interface.exportProcessingState,
        modalDialogRole: state.interface.modalDialogRole,
        clearMigrationDialog: state.migration.clearMigrationDialog,
        setExportProcessingState: state.interface.setExportProcessingState,
        setModalDialogRole: state.interface.setModalDialogRole,
        translate: state.i18n.translate
    }));
    const editorRefs = useSpecificationEditor();
    const classes = useModalDialogStyles();
    const dialogSurfaceClassName = useMemo(() => {
        switch (modalDialogRole) {
            case 'Version':
                return '';
            default:
                return classes.dialog;
        }
    }, [modalDialogRole]);
    const isOpen = modalDialogRole !== 'None';
    const closeLabel = useMemo(
        () => translate('Text_Button_Close'),
        [translate]
    );
    // Title resolves via i18n key `Text_Dialog_Title_${role}`. `'None'`
    // means the dialog is dismissed, but the Dialog stays mounted
    // briefly while Fluent runs its dismissal animation — so without
    // a cache the user would see the literal i18n key flash for a
    // frame between dispatch of `setModalDialogRole('None')` and
    // unmount. Keep the last non-None title in `useState` so React's
    // render-discard semantics keep the cache consistent across
    // concurrent-mode retries; mutating a ref during render (the
    // previous shape) could leak a stale value into a replay.
    const [cachedTitleLabel, setCachedTitleLabel] = useState('');
    useEffect(() => {
        if (modalDialogRole !== 'None') {
            setCachedTitleLabel(
                translate(`Text_Dialog_Title_${modalDialogRole}`)
            );
        }
    }, [modalDialogRole, translate]);
    const titleLabel = useMemo(() => {
        if (modalDialogRole === 'None') return cachedTitleLabel;
        return translate(`Text_Dialog_Title_${modalDialogRole}`);
    }, [modalDialogRole, translate, cachedTitleLabel]);
    const content = getDialogContent(modalDialogRole);
    const onClose = () => {
        // For version dialog, we update the version in properties
        if (modalDialogRole === 'Version') {
            clearMigrationDialog();
        }
        if (modalDialogRole === 'Create') {
            handleCloseCreateDialog();
        }
        if (modalDialogRole === 'Export') {
            setExportProcessingState('None');
        }
        setModalDialogRole('None');
        handleSetFocusToActiveEditor(editorRefs);
    };
    const shouldPreventClose = useMemo(
        () =>
            modalDialogRole === 'Export' &&
            exportProcessingState === 'Tokenizing',
        [modalDialogRole, exportProcessingState]
    );
    const dialogType: DialogProps['modalType'] = shouldPreventClose
        ? 'alert'
        : 'modal';
    logRender('ModalDialog', { isOpen, modalDialogRole });
    return (
        <Dialog
            open={isOpen}
            onOpenChange={(event, data) => {
                if (!data.open && !shouldPreventClose) {
                    onClose();
                }
                event.stopPropagation();
            }}
            modalType={dialogType}
        >
            <DialogSurface className={dialogSurfaceClassName}>
                <DialogBody className={classes.dialogBody}>
                    <DialogTitle>{titleLabel}</DialogTitle>
                    <DialogContent>
                        <div className={classes.pane}>
                            <div className={classes.paneRoot}>{content}</div>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        {getDialogPrimaryButton(modalDialogRole)}
                        <Button
                            appearance='secondary'
                            onClick={onClose}
                            disabled={shouldPreventClose}
                        >
                            {closeLabel}
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};

/**
 * Routes the primary button (and logic) based on the dialog role.
 */
const getDialogPrimaryButton = (dialogRole: ModalDialogRole) => {
    switch (dialogRole) {
        case 'Create':
            return <CreateButton />;
        case 'Export':
            return <ExportButtons />;
        default:
            return <></>;
    }
};

/**
 * Routes the dialog content based on the dialog role.
 */
const getDialogContent = (modalDialogRole: ModalDialogRole) => {
    switch (modalDialogRole) {
        case 'Create':
            return <VisualCreatePane />;
        case 'Version':
            return <VersionChangeContent />;
        case 'Export':
            return <ExportPane />;
        default: {
            return <></>;
        }
    }
};
