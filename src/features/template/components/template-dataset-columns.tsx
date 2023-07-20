import React from 'react';

import { DataColumnHeader } from './data-column-header';
import { TModalDialogType } from '../../modal-dialog';

interface ITemplateDatasetColumnsProps {
    role: TModalDialogType;
}

/**
 * Return the correct columns, based on role.
 */
export const TemplateDatasetColumns: React.FC<ITemplateDatasetColumnsProps> = ({
    role
}) => {
    switch (role) {
        case 'new': {
            return (
                <>
                    <DataColumnHeader columnRole='type' />
                    <DataColumnHeader columnRole='name' />
                    <DataColumnHeader columnRole='assignment' />
                    <DataColumnHeader columnRole='description' />
                </>
            );
        }
        case 'mapping': {
            return (
                <>
                    <DataColumnHeader columnRole='type' />
                    <DataColumnHeader columnRole='originalName' />
                    <DataColumnHeader columnRole='assignment' />
                </>
            );
        }
    }
    return <></>;
};
