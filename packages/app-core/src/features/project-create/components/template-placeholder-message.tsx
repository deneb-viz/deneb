import { Caption1, makeStyles, tokens } from '@fluentui/react-components';

import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { useDenebState } from '../../../state';

export const useTemplatePlaceholderMessageStyles = makeStyles({
    templatePlaceholderMessage: {
        paddingTop: tokens.spacingVerticalL,
        paddingBottom: tokens.spacingVerticalL
    }
});

/**
 * Displays correct message, depending on whether the template has
 * placeholders or not.
 */
export const TemplatePlaceholderMessage = () => {
    const { metadata, translate } = useDenebState((state) => ({
        metadata: state.create.metadata,
        translate: state.i18n.translate
    }));
    const classes = useTemplatePlaceholderMessageStyles();
    const hasPlaceholders = templateHasPlaceholders(metadata);
    const message = translate(
        hasPlaceholders
            ? 'Text_Create_Placeholders'
            : 'Text_Create_No_Placeholders',
        [translate('Button_Create')]
    );
    return (
        <div className={classes.templatePlaceholderMessage}>
            <Caption1 italic>{message}</Caption1>
        </div>
    );
};

/**
 * Confirms that the supplied template metadata contains dataset entries, and
 * that placeholders are needed to populate them.
 */
const templateHasPlaceholders = (
    template: UsermetaTemplate | undefined | null
) => (template?.dataset?.length ?? 0) > 0;
