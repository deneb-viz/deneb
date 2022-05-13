import {
    getTheme,
    IChoiceGroupStyles,
    IChoiceGroupOptionStyles,
    ITheme,
    IDropdownStyles
} from '@fluentui/react';

export { choiceGroupStyles, choiceItemStyles };

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

export const horizontalDropdownStyles: Partial<IDropdownStyles> = {
    root: {
        display: 'flex',
        flexWrap: 'wrap'
    },
    label: {
        paddingRight: 16
    }
};
