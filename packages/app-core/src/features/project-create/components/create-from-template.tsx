import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { useModalDialogStyles } from '../../../components/ui';
import { useDenebState } from '../../../state';
import { logRender } from '@deneb-viz/utils/logging';
import { NoTemplateMessage } from './no-template-message';
import { TemplateInformation } from './template-information';

/**
 * Displays the content for creating a specification using the selected
 * template.
 */
export const CreateFromTemplate = () => {
    const classes = useModalDialogStyles();
    const metadata = useDenebState((state) => state.create.metadata, shallow);
    const content = useMemo(
        () => routeInformationContent(metadata as UsermetaTemplate),
        [metadata]
    );
    logRender('CreateFromTemplate');
    return (
        <div className={classes.paneContent}>
            <div className={classes.paneContentScrollable}>{content}</div>
        </div>
    );
};

const routeInformationContent = (createMetadata: UsermetaTemplate) => {
    if (!createMetadata || Object.keys(createMetadata || {})?.length === 0) {
        return <NoTemplateMessage />;
    }
    return <TemplateInformation />;
};
