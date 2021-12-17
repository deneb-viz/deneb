import {
    getFocusStyle,
    getTheme,
    IChoiceGroupStyles,
    IChoiceGroupOptionStyles,
    IStackItemStyles,
    IStackStyles,
    IStackTokens,
    ITheme,
    mergeStyleSets,
    FontSizes
} from '@fluentui/react';

import { theme } from '../../core/ui/fluent';

export {
    choiceGroupStyles,
    choiceItemStyles,
    templateExportInfoStackTokens,
    templatePickerItemListStyles,
    templatePickerStackStyles,
    templatePickerStackItemStyles,
    templatePickerStackSeparatorStyles,
    templatePickerStackItemListStyles,
    templatePickerNonShrinkingStackItemStyles,
    templatePickerStackTokens
};

const defaultTheme: ITheme = getTheme();

// Horizontal choice group (settings pivot)
const choiceGroupStyles: IChoiceGroupStyles = {
        flexContainer: {
            display: 'flex',
            flexWrap: 'wrap'
        }
    },
    choiceItemStyles: IChoiceGroupOptionStyles = {
        root: {
            paddingRight: '16px'
        }
    };

// Template picker items
const templatePickerItemListStyles = mergeStyleSets({
        itemCell: [
            getFocusStyle(defaultTheme, { inset: -1 }),
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
    }),
    templatePickerStackStyles: IStackStyles = {
        root: {
            width: '100%',
            height: '100%',
            maxHeight: '100%',
            maxWidth: '100%'
        }
    },
    templatePickerStackItemStyles: IStackItemStyles = {
        root: {
            display: 'flex',
            maxHeight: '100%'
        }
    },
    templatePickerStackSeparatorStyles: IStackStyles = {
        ...templatePickerStackItemStyles,
        ...{
            root: { width: 15 }
        }
    },
    templatePickerStackItemListStyles: IStackItemStyles = {
        ...templatePickerStackItemStyles,
        ...{
            root: { overflowY: 'auto', width: 300, maxWidth: 300 }
        }
    },
    templatePickerNonShrinkingStackItemStyles: IStackItemStyles = {
        ...templatePickerStackStyles,
        ...{
            root: {
                overflowY: 'auto'
            }
        }
    },
    templatePickerStackTokens: IStackTokens = {
        childrenGap: 50
    },
    templateExportInfoStackTokens: IStackTokens = {
        childrenGap: 5
    };
