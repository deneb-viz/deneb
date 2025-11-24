import { type DenebTemplateCreateMode } from '@deneb-viz/json-processing/template-processing';
import { logRender } from '@deneb-viz/utils/logging';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { useModalDialogStyles } from '../../../components/ui';
import { CreateMethod } from './create-method';
import { CreateFromTemplate } from './create-from-template';
import { ImportDropzone } from './import-dropzone';
import { SelectIncludedTemplate } from './select-included-template';
import { useDenebState } from '../../../state';

/**
 * Interface (pane) for creating a new visualization.
 */
export const VisualCreatePane = () => {
    const mode = useDenebState((state) => state.create.mode);
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
const routeCreateModePane = (createMode: DenebTemplateCreateMode) => {
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
