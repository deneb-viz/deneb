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

export const ModalDialog: React.FC = () => {
    const { modalDialogRole, clearMigrationDialog, setModalDialogRole } = store(
        (state) => ({
            modalDialogRole: state.interface.modalDialogRole,
            clearMigrationDialog: state.migration.clearMigrationDialog,
            setModalDialogRole: state.interface.setModalDialogRole
        }),
        shallow
    );
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
        setModalDialogRole('None');
    };
    const onOpenChange: DialogProps['onOpenChange'] = useCallback(
        (event, data) => {
            if (!data.open) {
                onClose();
            }
        },
        []
    );
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogSurface className={dialogSurfaceClassName}>
                <DialogBody className={classes.dialogBody}>
                    <DialogTitle>{titleLabel}</DialogTitle>
                    <DialogContent>
                        <div className={classes.pane}>
                            <div className={classes.paneRoot}>{content}</div>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        {/* TODO: primary action button */}
                        <Button appearance='secondary' onClick={onClose}>
                            {closeLabel}
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};

const getDialogContent = (modalDialogRole: ModalDialogRole) => {
    switch (modalDialogRole) {
        case 'Version':
            return <VersionChangeContent />;
        default: {
            return <></>;
        }
    }
};
