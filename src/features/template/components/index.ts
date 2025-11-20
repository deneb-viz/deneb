import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useTemplateStyles = makeStyles({
    datasetDataType: {
        minWidth: '15px',
        maxWidth: '15px'
    },
    datasetColumnName: {
        minWidth: '150px',
        maxWidth: '250px'
    },
    datasetColumnAssignment: {
        minWidth: '300px'
    },
    datasetAssignmentDropdown: {
        width: '300px',
        '& [role="listbox"]': {
            zIndex: 2000000
        }
    },
    datasetDescriptionField: {
        ...shorthands.padding('5px')
    },
    additionalAssignmentFulfilled: {
        color: tokens.colorPaletteGreenForeground1
    },
    tableRow: {
        alignItems: 'start'
    }
});
