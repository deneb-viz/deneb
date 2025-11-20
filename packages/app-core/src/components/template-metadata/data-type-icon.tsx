import {
    ToggleRightRegular,
    CalendarLtrRegular,
    NumberSymbolRegular,
    TextCaseUppercaseRegular
} from '@fluentui/react-icons';
import { type UsermetaDatasetFieldType } from '@deneb-viz/template-usermeta';

type DataTypeIconProps = {
    type: UsermetaDatasetFieldType | undefined;
};

/**
 * Resolves the correct icon for the data type in a template.
 */
export const DataTypeIcon = ({ type }: DataTypeIconProps) => {
    switch (type) {
        case 'bool':
            return <ToggleRightRegular />;
        case 'text':
            return <TextCaseUppercaseRegular />;
        case 'numeric':
            return <NumberSymbolRegular />;
        case 'dateTime':
            return <CalendarLtrRegular />;
        default:
            return <></>;
    }
};
