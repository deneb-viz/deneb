import { Body1, Caption1 } from '@fluentui/react-components';

import { FieldRemapPaneProgress } from './field-remap-pane-progress';
import { useModalDialogStyles } from '../../../components/ui';
import { useDenebState } from '../../../state';
import { logRender } from '@deneb-viz/utils/logging';
import { TemplateDataset } from '../../../components/template-metadata';

/**
 * Interface (pane) for remapping visual fields.
 */
export const FieldRemapPane = () => {
    const classes = useModalDialogStyles();
    const remapState = useDenebState((state) => state.interface.remapState);
    const translate = useDenebState((state) => state.i18n.translate);
    logRender('FieldRemapPane');
    return (
        <div className={classes.paneRoot}>
            <div className={classes.paneMenu}>
                <p>
                    <Body1>{translate('Text_Dialog_Overview_Remap')}</Body1>
                </p>
                <p>
                    <Body1>
                        {translate('Text_Dialog_Instruction_Remap', [
                            translate('Text_Button_Remap')
                        ])}
                    </Body1>
                </p>
                <p>
                    <Caption1 italic>
                        {translate('Text_Dialog_Notes_Remap', [
                            translate('Text_Button_Close')
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
