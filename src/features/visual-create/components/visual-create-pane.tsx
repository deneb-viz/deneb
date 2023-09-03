import React from 'react';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { logRender } from '../../logging';
import { ImportDropzone } from './import-dropzone';
import { CreateMethod } from './create-method';
import { SelectIncludedTemplate } from './select-included-template';
import { CreateFromTemplate } from './create-from-template';
import { getI18nValue } from '../../i18n';
import { useModalDialogStyles } from '../../modal-dialog';
import { TTemplateProvider } from '../../template';

/**
 * Interface (pane) for creating a new visualization.
 */
export const VisualCreatePane: React.FC = () => {
    const mode = store((state) => state.create.mode, shallow);
    const classes = useModalDialogStyles();
    logRender('VisualCreatePane');
    return (
        <div className={classes.paneRoot}>
            <div className={classes.paneMenu}>
                <div>{getI18nValue('Text_Overview_Create')}</div>
                <CreateMethod />
                {routeCreateModePane(mode)}
            </div>
            <CreateFromTemplate />
        </div>
    );
};

/**
 * Ensures that the correct component is displayed based on the desired create
 * method.
 */
const routeCreateModePane = (createMode: TTemplateProvider) => {
    switch (createMode) {
        case 'import':
            return (
                <div>
                    <ImportDropzone />
                </div>
            );
        case 'vegaLite':
        case 'vega':
            return <SelectIncludedTemplate createMode={createMode} />;
        default:
            return <div />;
    }
};
