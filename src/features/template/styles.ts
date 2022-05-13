import {
    getFocusStyle,
    getTheme,
    IStackItemStyles,
    IStackStyles,
    IStackTokens,
    mergeStyleSets,
    FontSizes
} from '@fluentui/react';
import { theme } from '../../core/ui/fluent';

export const TEMPLATE_EXPORT_INFO_STACK_TOKENS: IStackTokens = {
    childrenGap: 5
};

export const TEMPLATE_PICKER_LIST_ITEM_STYLES = mergeStyleSets({
    itemCell: [
        getFocusStyle(getTheme(), { inset: -1 }),
        {
            minHeight: 34,
            padding: 10,
            boxSizing: 'border-box',
            borderBottom: `1px solid ${theme.palette.neutralLighterAlt}`,
            display: 'flex',
            selectors: {
                '&:hover': { background: theme.palette.neutralLight },
                '&:focus': { background: theme.palette.neutralLighterAlt },
                '&[tabindex="0"]': {
                    background: theme.palette.neutralLighterAlt
                }
            }
        }
    ],
    itemImage: {
        flexShrink: 0
    },
    itemContent: {
        overflow: 'hidden',
        flexGrow: 1,
        fontSize: FontSizes.smallPlus
    },
    itemName: [
        {
            fontSize: FontSizes.medium,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        }
    ],
    itemIndex: {
        fontSize: FontSizes.small,
        color: theme.palette.neutralTertiary,
        marginBottom: 10
    },
    chevron: {
        alignSelf: 'center',
        marginLeft: 10,
        color: theme.palette.neutralTertiary,
        fontSize: FontSizes.large,
        flexShrink: 0
    }
});

export const TEMPLATE_PICKER_STACK_ITEM_LIST_STYLES: IStackItemStyles = {
    root: {
        display: 'flex',
        maxHeight: '100%',
        overflowY: 'auto',
        width: 250,
        maxWidth: 250
    }
};

export const TEMPLATE_PICKER_STACK_STYLES: IStackStyles = {
    root: {
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        maxWidth: '100%'
    }
};

export const TEMPLATE_PICKER_STACK_TOKENS: IStackTokens = {
    childrenGap: 25
};

export const TEMPLATE_PICKER_NON_SHRINKING_STACK_ITEM_STYLES: IStackItemStyles =
    {
        ...TEMPLATE_PICKER_STACK_STYLES,
        ...{
            root: {
                overflowY: 'auto'
            }
        }
    };
