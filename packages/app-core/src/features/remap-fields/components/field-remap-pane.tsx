import { Body1, Caption1 } from '@fluentui/react-components';

import { FieldRemapPaneProgress } from './field-remap-pane-progress';
import { useModalDialogStyles } from '../../../components/ui';
import { useDenebState } from '../../../state';
import { logRender } from '@deneb-viz/utils/logging';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { TemplateDataset } from '../../../components/template-metadata';

/**
 * Interface (pane) for remapping visual fields.
 */
export const FieldRemapPane = () => {
    const classes = useModalDialogStyles();
    const remapState = useDenebState((state) => state.interface.remapState);
    logRender('FieldRemapPane');
    return (
        <div className={classes.paneRoot}>
            <div className={classes.paneMenu}>
                <p>
                    <Body1>{getI18nValue('Text_Dialog_Overview_Remap')}</Body1>
                </p>
                <p>
                    <Body1>
                        {getI18nValue('Text_Dialog_Instruction_Remap', [
                            getI18nValue('Text_Button_Remap')
                        ])}
                    </Body1>
                </p>
                <p>
                    <Caption1 italic>
                        {getI18nValue('Text_Dialog_Notes_Remap', [
                            getI18nValue('Text_Button_Close')
                        ])}
                    </Caption1>
                </p>
            </div>
            <div className={classes.paneContent}>
                {remapState !== 'None' ? (
                    <FieldRemapPaneProgress />
                ) : (
                    <div className={classes.paneContentScrollable}>
                        <TemplateDataset datasetRole='mapping' />
                    </div>
                )}
            </div>
        </div>
    );
};
