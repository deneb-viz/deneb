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

import { useModalDialogStyles } from './index';
import store from '../../../store';
import { getI18nValue } from '../../i18n';
import { ModalDialogRole } from '../types';
import { VersionChangeContent } from './version-change-content';
import { FieldRemapPane, RemapButton } from '../../remap-fields';
import { logRender } from '../../logging';
import { CreateButton, VisualCreatePane } from '../../visual-create';
import { closeCreateDialog } from '../../../core/ui/commands';
import { ExportButtons, VisualExportPane } from '../../visual-export';
import {
    setFocusToActiveEditor,
    useJsonEditorContext
} from '../../json-editor';
import {
    RemapState,
    TemplateExportProcessingState
} from '@deneb-viz/core-dependencies';

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
    const editorRefs = useJsonEditorContext();
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
            setExportProcessingState(TemplateExportProcessingState.None);
        }
        setModalDialogRole('None');
        setFocusToActiveEditor(editorRefs);
    };
    const shouldPreventClose = useMemo(
        () =>
            (modalDialogRole === 'Remap' && remapState !== RemapState.None) ||
            (modalDialogRole === 'Export' &&
                exportProcessingState !== TemplateExportProcessingState.None),
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
        case 'Remap':
            return <RemapButton />;
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
