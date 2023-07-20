import React from 'react';
import {
    ToggleRightRegular,
    CalendarLtrRegular,
    NumberSymbolRegular,
    TextCaseUppercaseRegular
} from '@fluentui/react-icons';

import { TDatasetFieldType } from '..';

interface IDataTypeIconProps {
    type: TDatasetFieldType;
}

/**
 * Resolves the correct icon for the data type in a template.
 */
export const DataTypeIcon: React.FC<IDataTypeIconProps> = ({ type }) => {
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
