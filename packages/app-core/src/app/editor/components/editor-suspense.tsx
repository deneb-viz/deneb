import { Field, ProgressBar } from '@fluentui/react-components';
import { useDenebState } from '../../../state';

export const EditorSuspense = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    return (
        <Field
            validationMessage={translate('Text_Editor_Suspense_Message')}
            validationState='none'
        >
            <ProgressBar />
        </Field>
    );
};
