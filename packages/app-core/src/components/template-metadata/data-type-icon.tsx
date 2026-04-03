import {
    ToggleRightRegular,
    CalendarLtrRegular,
    NumberSymbolRegular,
    TextCaseUppercaseRegular
} from '@fluentui/react-icons';
import FabricTableColumnQuestion16Regular from '@fabric-msft/svg-icons/dist/TableColumnQuestion16Regular';
import {
    type UsermetaDatasetFieldKind,
    type UsermetaDatasetFieldType
} from '@deneb-viz/data-core/field';

type DataTypeIconProps = {
    type: UsermetaDatasetFieldType | undefined;
    kind?: UsermetaDatasetFieldKind;
};

/**
 * Resolves the correct icon for the data type (or field kind) in a template.
 * Field parameters take precedence over data type when displaying icons.
 */
export const DataTypeIcon = ({ type, kind }: DataTypeIconProps) => {
    if (kind === 'parameter') {
        return <FabricTableColumnQuestion16Regular width={16} height={16} />;
    }
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
