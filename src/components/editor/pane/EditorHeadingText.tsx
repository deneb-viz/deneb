import React from 'react';

import { handleEditorPane } from '../../../core/ui/commands';
import { i18nValue } from '../../../core/ui/i18n';
import { reactLog } from '../../../core/utils/logger';

import { EditorHeading } from '../../elements/Typography';

const EditorHeadingText: React.FC = () => {
    reactLog('Rendering [EditorHeadingText]');
    return (
        <>
            <div
                className='editor-heading'
                onClick={handleEditorPane}
                role='button'
            >
                <EditorHeading>{i18nValue('Editor_Heading')}</EditorHeading>
            </div>
        </>
    );
};

export default EditorHeadingText;
