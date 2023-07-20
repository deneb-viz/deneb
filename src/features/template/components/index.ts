import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { TEMPLATE_PREVIEW_IMAGE_MAX_SIZE } from '../../../constants';

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
    previewImage: {
        minWidth: `${TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}px`,
        minHeight: `${TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}px`,
        width: `${TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}px`,
        height: `${TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}px`,
        ...shorthands.margin('5px')
    }
});
