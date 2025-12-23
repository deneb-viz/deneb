import {
    Body1,
    Caption1,
    makeStyles,
    Subtitle2
} from '@fluentui/react-components';

import { isBase64Image } from '@deneb-viz/utils/base64';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { TemplatePlaceholderMessage } from './template-placeholder-message';
import {
    PreviewImage,
    TemplateDataset
} from '../../../components/template-metadata';
import { useDenebState } from '../../../state';

export const useTemplateInformationStyles = makeStyles({
    header: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%'
    },
    content: { flexGrow: 1 },
    previewImageContainer: { marginLeft: '10px', marginRight: '10px' },
    title: {
        paddingBottom: '1em'
    }
});

/**
 * Displays the information and placeholders for a template.
 */
export const TemplateInformation = () => {
    const metadata = useDenebState((state) => state.create.metadata);
    const translate = useDenebState((state) => state.i18n.translate);
    if (!metadata) return null;
    const classes = useTemplateInformationStyles();
    const { previewImageBase64PNG } = metadata?.information || {};
    const isValid =
        (previewImageBase64PNG && isBase64Image(previewImageBase64PNG)) ||
        false;
    const dataUri = isValid ? previewImageBase64PNG : '';
    logDebug('Image', { previewImageBase64PNG, isValid, dataUri });
    logRender('TemplateInformation');
    return (
        <>
            <div className={classes.header}>
                <div className={classes.content}>
                    <div className={classes.title}>
                        <Subtitle2>{metadata.information.name}</Subtitle2>{' '}
                        <Caption1>
                            {translate('Text_Template_By')}{' '}
                            {metadata.information.author ||
                                translate('Text_Template_No_Author')}
                        </Caption1>
                    </div>
                    <div>
                        <Body1>
                            {metadata.information.description ||
                                translate('Text_Template_No_Description')}
                        </Body1>
                    </div>
                    <TemplatePlaceholderMessage />
                </div>
                <div className={classes.previewImageContainer}>
                    {dataUri && (
                        <PreviewImage isValid={isValid} dataUri={dataUri} />
                    )}
                </div>
            </div>
            <TemplateDataset
                datasetRole='new'
                key={metadata?.information?.uuid}
            />
        </>
    );
};
