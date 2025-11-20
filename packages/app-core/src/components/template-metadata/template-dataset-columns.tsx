import { type ModalDialogType } from '../ui';
import { DataColumnHeader } from './data-column-header';

type TemplateDatasetColumnsProps = {
    role: ModalDialogType;
};

/**
 * Return the correct columns, based on role.
 */
export const TemplateDatasetColumns = ({
    role
}: TemplateDatasetColumnsProps) => {
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
        case 'export': {
            return (
                <>
                    <DataColumnHeader columnRole='type' />
                    <DataColumnHeader columnRole='originalName' />
                    <DataColumnHeader columnRole='exportName' />
                    <DataColumnHeader columnRole='exportDescription' />
                </>
            );
        }
    }
    return <></>;
};
