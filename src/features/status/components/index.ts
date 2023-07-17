import {
    GriffelStyle,
    makeStyles,
    shorthands,
    tokens,
    typographyStyles
} from '@fluentui/react-components';

const flexContainerGeneric: GriffelStyle = {
    display: 'flex',
    flexWrap: 'nowrap',
    width: 'auto',
    height: 'auto',
    boxSizing: 'border-box',
    '> *': {
        textOverflow: 'ellipsis'
    },
    '> :not(:first-child)': {
        marginTop: '0px'
    },
    '> *:not(.ms-StackItem)': {
        flexShrink: 1
    }
};

/**
 * Common styles for status components.
 */
export const useStatusStyles = makeStyles({
    container: {
        height: '100vh',
        width: '100vw',
        overflowY: 'auto'
    },
    cardContainer: {
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'wrap',
        ...shorthands.gap('10px'),
        ...shorthands.padding('5px')
    },
    card: {
        width: '100%',
        maxWidth: '100%',
        height: 'fit-content',
        rowGap: '5px',
        ...shorthands.padding('2px')
    },
    cardSection: {
        width: 'fit-content'
    },
    cardTitle: {
        ...shorthands.margin(0, 0, '2px')
    },
    cardCaption: {
        color: tokens.colorNeutralForeground3,
        fontStyle: 'italic'
    },
    cardDescription: {
        ...shorthands.margin(0, 0, '5px')
    },
    headerFlexHorizontal: {
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        columnGap: '5px'
    },
    li: {
        listStyleType: 'unset'
    },
    landingUl: {
        paddingLeft: '20pt',
        ...shorthands.margin(0)
    },
    landingLi: {
        listStyleType: 'unset',
        paddingBottom: '4pt'
    },
    flexContainerHorizontal: {
        ...flexContainerGeneric,
        ...{ flexDirection: 'row' }
    },
    flexContainerVertical: {
        ...flexContainerGeneric,
        ...{ flexDirection: 'column' }
    },
    flexItem: {
        height: 'auto',
        width: 'auto',
        flexShrink: 1
    }
});
