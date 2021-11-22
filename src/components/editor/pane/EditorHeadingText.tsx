import React from 'react';

import { handleEditorPane } from '../../../core/ui/commands';
import { i18nValue } from '../../../core/ui/i18n';

import { BodyHeading } from '../../elements/Typography';

const EditorHeadingText: React.FC = () => (
    <>
        <div
            className='editor-heading'
            onClick={handleEditorPane}
            role='button'
        >
            <BodyHeading>{i18nValue('Editor_Heading')}</BodyHeading>
        </div>
    </>
);

export default EditorHeadingText;
