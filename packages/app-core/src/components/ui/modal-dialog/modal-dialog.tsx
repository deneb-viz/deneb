import { useMemo } from 'react';
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

import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
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
import { FieldRemapPane } from '../../../features/remap-fields';

export const ModalDialog = () => {
    const {
        exportProcessingState,
        modalDialogRole,
        remapState,
        clearMigrationDialog,
        setExportProcessingState,
        setModalDialogRole
    } = useDenebState((state) => ({
        exportProcessingState: state.interface.exportProcessingState,
        modalDialogRole: state.interface.modalDialogRole,
        remapState: state.interface.remapState,
        clearMigrationDialog: state.migration.clearMigrationDialog,
        setExportProcessingState: state.interface.setExportProcessingState,
        setModalDialogRole: state.interface.setModalDialogRole
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
    const closeLabel = useMemo(() => getI18nValue('Text_Button_Close'), []);
    const titleLabel = useMemo(
        () => getI18nValue(`Text_Dialog_Title_${modalDialogRole}`),
        [modalDialogRole]
    );
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
            (modalDialogRole === 'Remap' && remapState !== 'None') ||
            (modalDialogRole === 'Export' && exportProcessingState !== 'None'),
        [modalDialogRole, remapState]
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
        // Tracking is now only used for export (#486)
        // case 'Remap':
        //     return <RemapButton />;
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
        case 'Remap':
            return <FieldRemapPane />;
        case 'Export':
            return <ExportPane />;
        default: {
            return <></>;
        }
    }
};
