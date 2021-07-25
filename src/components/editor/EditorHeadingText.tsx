import React from 'react';

import { toggleEditorPane } from '../../api/commands';
import { i18nValue } from '../../core/ui/i18n';

import { BodyHeading } from '../elements/Typography';

const EditorHeadingText: React.FC = () => (
    <>
        <div
            className='editor-heading'
            onClick={toggleEditorPane}
            role='button'
        >
            <BodyHeading>{i18nValue('Editor_Heading')}</BodyHeading>
        </div>
    </>
);

export default EditorHeadingText;
