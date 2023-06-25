import React from 'react';

import { handleEditorPane } from '../../../core/ui/commands';

import { EditorHeading } from '../../elements/Typography';
import { logRender } from '../../../features/logging';
import { getI18nValue } from '../../../features/i18n';

const EditorHeadingText: React.FC = () => {
    logRender('EditorHeadingText');
    return (
        <>
            <div
                className='editor-heading'
                onClick={handleEditorPane}
                role='button'
            >
                <EditorHeading>{getI18nValue('Editor_Heading')}</EditorHeading>
            </div>
        </>
    );
};

export default EditorHeadingText;
