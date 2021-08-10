export {
    TModalDialogType,
    getDialogContentProps,
    isApplyDialogHidden,
    isDialogOpen,
    modalDialogContentStyles,
    modalDialogCloseIconStyles,
    modalDialogPropsStyles,
    modalDialogStackStyles,
    modalDialogStackItemStyles,
    modalDialogStackItemWrapperStyles,
    modalDialogInnerStackTokens
};

import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import { DialogType, IDialogContentProps } from '@fluentui/react/lib/Dialog';
import { IModalProps } from '@fluentui/react/lib/Modal';
import {
    IStackStyles,
    IStackItemStyles,
    IStackTokens
} from '@fluentui/react/lib/Stack';
import {
    mergeStyleSets,
    FontSizes,
    FontWeights
} from '@fluentui/react/lib/Styling';

import { theme } from './fluent';
import { getConfig } from '../utils/config';
import { getState } from '../../store';
import { i18nValue } from './i18n';

/**
 * Modal dialog type (used for specific ops handling).
 */
type TModalDialogType = 'new' | 'export';

/**
 * Populate suitable `IDialogContentProps` based on supplied i18n keys.
 */
const getDialogContentProps = (
    titleKey: string,
    subTextKey: string
): IDialogContentProps => {
    return {
        type: DialogType.normal,
        title: i18nValue(titleKey),
        subText: i18nValue(subTextKey),
        showCloseButton: false
    };
};

/**
 * Determine whether the apply changes dialog should be hidden or not. This dialog is used to prompt the user to save
 * their changes if they leave the editor and the editors are dirty.
 */
const isApplyDialogHidden = () => {
    const { visualMode, isDirty } = getState().visual;
    return !(isDirty && visualMode === 'Standard');
};

/**
 * Determine whether Deneb is currently showing a dialog, based on the Redux store.
 */
const isDialogOpen = () => {
    const { isNewDialogVisible, isExportDialogVisible } = getState().visual;
    return isNewDialogVisible || isExportDialogVisible;
};

/**
 * General properties for pop-up dialogs within the UI.
 */
const modalDialogPropsStyles: IModalProps = {
    isBlocking: true,
    styles: {
        main: {
            maxWidth: 450
        }
    }
};

const modalDialogContentStyles = (viewport: IViewport) => {
        const dialogHeight =
                viewport.height * getConfig().modalDialog.heightPercent,
            dialogWidth = viewport.width * getConfig().modalDialog.widthPercent;
        return mergeStyleSets({
            container: {
                display: 'flex',
                flexFlow: 'column nowrap',
                overflowY: 'hidden',
                alignItems: 'stretch',
                height: dialogHeight,
                width: dialogWidth
            },
            header: [
                {
                    flex: '1 1 auto',
                    borderTop: `4px solid ${theme.palette.themePrimary}`,
                    color: theme.palette.neutralPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: FontSizes.xLargePlus,
                    fontWeight: FontWeights.semibold,
                    padding: '12px 12px 14px 24px'
                }
            ],
            body: {
                flex: '4 4 auto',
                padding: '0 24px 0px 24px',
                overflowY: 'hidden',
                selectors: {
                    p: { margin: '14px 0' },
                    'p:first-child': { marginTop: 0 },
                    'p:last-child': { marginBottom: 0 }
                },
                height: `calc(100% - 4px - 12px - 14px - ${FontSizes.xLargePlus} - 14px)`
            }
        });
    },
    modalDialogCloseIconStyles = {
        root: {
            color: theme.palette.neutralPrimary,
            marginLeft: 'auto',
            marginTop: '4px',
            marginRight: '2px'
        },
        rootHovered: {
            color: theme.palette.neutralDark
        }
    },
    modalDialogStackStyles: IStackStyles = {
        root: {
            height: '100%'
        }
    },
    modalDialogStackItemStyles: IStackItemStyles = {
        root: {
            display: 'flex'
        }
    },
    modalDialogStackItemWrapperStyles: IStackItemStyles = {
        root: {
            display: 'flex',
            minHeight: 0,
            paddingTop: '10px'
        }
    },
    modalDialogInnerStackTokens: IStackTokens = {
        childrenGap: 15,
        padding: 10
    };
