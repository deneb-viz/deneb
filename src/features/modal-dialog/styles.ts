import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import {
    mergeStyleSets,
    FontSizes,
    FontWeights
} from '@fluentui/react/lib/Styling';
import { IModalProps } from '@fluentui/react/lib/Modal';
import {
    IStackStyles,
    IStackItemStyles,
    IStackTokens
} from '@fluentui/react/lib/Stack';

import { theme } from '../../core/ui/fluent';
import { getConfig } from '../../core/utils/config';

export const MODAL_DIALOG_CLOSE_ICON_STYLES = {
    root: {
        color: theme.palette.neutralPrimary,
        marginLeft: 'auto',
        marginTop: '4px',
        marginRight: '2px'
    },
    rootHovered: {
        color: theme.palette.neutralDark
    }
};

/**
 * General properties for pop-up dialogs within the UI.
 */
export const MODAL_DIALOG_PROPS: IModalProps = {
    isBlocking: true,
    styles: {
        main: {
            maxWidth: 450
        }
    }
};

export const MODAL_DIALOG_STACK_ITEM_STYLES: IStackItemStyles = {
    root: {
        display: 'flex'
    }
};

export const MODAL_DIALOG_STACK_INNER_TOKENS: IStackTokens = {
    childrenGap: 15,
    padding: 10
};

export const MODAL_DIALOG_STACK_STYLES: IStackStyles = {
    root: {
        height: '100%'
    }
};

export const MODAL_DIALOG_STACK_ITEM_WRAPPER_STYLES: IStackItemStyles = {
    root: {
        display: 'flex',
        minHeight: 0,
        paddingTop: '10px',
        width: '100%'
    }
};

export const getModalDialogContentStyles = (viewport: IViewport) => {
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
};
