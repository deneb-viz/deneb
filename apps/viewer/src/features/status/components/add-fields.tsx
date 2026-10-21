import { TableAdd24Regular } from '@fluentui/react-icons';

import { StatusMessage } from './status-message';

type AddFieldsProps = {
    /** Whether the visual already holds a template. */
    hasTemplate: boolean;
};

/**
 * Shown to authors when the Dataset well is empty. The import surface
 * replaces it as soon as a field is added.
 */
export const AddFields = ({ hasTemplate }: AddFieldsProps) =>
    hasTemplate ? (
        <StatusMessage
            icon={<TableAdd24Regular />}
            i18nHeading='PowerBI_Viewer_Add_Fields_Template_Heading'
            i18nBody='PowerBI_Viewer_Add_Fields_Template_Body'
        />
    ) : (
        <StatusMessage
            icon={<TableAdd24Regular />}
            i18nHeading='PowerBI_Viewer_Add_Fields_Heading'
            i18nBody='PowerBI_Viewer_Add_Fields_Body'
        />
    );
