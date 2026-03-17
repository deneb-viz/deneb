import { Field, makeStyles, ProgressBar } from '@fluentui/react-components';
import { useDenebState } from '../../../state';

const useEditorSuspenseStyles = makeStyles({
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%'
    }
});

export const EditorSuspense = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useEditorSuspenseStyles();
    return (
        <div className={classes.container}>
            <Field
                validationMessage={translate('Text_Editor_Suspense_Message')}
                validationState='none'
            >
                <ProgressBar />
            </Field>
        </div>
    );
};
