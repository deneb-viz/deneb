import React, { useCallback, useMemo } from 'react';
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
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { closeCreateDialog } from '../../../core/ui/commands';
import { VisualExportPane } from '../../visual-export';
import { setFocusToActiveEditor } from '../../json-editor';
import {
    CreateButton,
    ExportButtons,
    FieldRemapPane,
    useModalDialogStyles,
    useSpecificationEditor,
    VersionChangeContent,
    VisualCreatePane,
    type ModalDialogRole
} from '@deneb-viz/app-core';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';

export const ModalDialog: React.FC = () => {
    const {
        exportProcessingState,
        modalDialogRole,
        remapState,
        clearMigrationDialog,
        setExportProcessingState,
        setModalDialogRole
    } = store(
        (state) => ({
            exportProcessingState: state.interface.exportProcessingState,
            modalDialogRole: state.interface.modalDialogRole,
            remapState: state.interface.remapState,
            clearMigrationDialog: state.migration.clearMigrationDialog,
            setExportProcessingState: state.interface.setExportProcessingState,
            setModalDialogRole: state.interface.setModalDialogRole
        }),
        shallow
    );
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
            closeCreateDialog();
        }
        if (modalDialogRole === 'Export') {
            setExportProcessingState('None');
        }
        setModalDialogRole('None');
        setFocusToActiveEditor(editorRefs);
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
    const onOpenChange: DialogProps['onOpenChange'] = useCallback(
        (event, data) => {
            if (!data.open && !shouldPreventClose) {
                onClose();
            }
            event.stopPropagation();
        },
        [modalDialogRole]
    );
    logRender('ModalDialog', { isOpen, modalDialogRole });
    return (
        <Dialog
            open={isOpen}
            onOpenChange={onOpenChange}
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
            return <VisualExportPane />;
        default: {
            return <></>;
        }
    }
};
