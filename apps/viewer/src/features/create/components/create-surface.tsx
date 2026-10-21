import {
    Body1,
    FluentProvider,
    makeStyles,
    tokens
} from '@fluentui/react-components';

import {
    CreateFromTemplate,
    getDenebTheme,
    ImportDropzone,
    THEME_DEFAULT,
    useDenebState
} from '@deneb-viz/app-core';
import { logRender } from '@deneb-viz/utils/logging';

const useCreateSurfaceStyles = makeStyles({
    root: {
        backgroundColor: tokens.colorNeutralBackground1,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'auto',
        padding: tokens.spacingVerticalM,
        rowGap: tokens.spacingVerticalM,
        width: '100%'
    },
    template: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: '200px'
    }
});

/**
 * The authoring surface for a visual with no template: import a template
 * exported from Deneb, assign fields to its placeholders, then create.
 *
 * It is a single column that scrolls rather than clips, so it stays usable
 * in a small tile. The import and placeholder pieces are app-core's, so
 * their keyboard and focus behaviour match Deneb's create dialog.
 */
export const CreateSurface = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useCreateSurfaceStyles();
    logRender('CreateSurface');
    return (
        <FluentProvider
            theme={getDenebTheme(THEME_DEFAULT)}
            className={classes.root}
        >
            <Body1>{translate('PowerBI_Viewer_Create_Overview')}</Body1>
            <ImportDropzone />
            <div className={classes.template}>
                <CreateFromTemplate />
            </div>
        </FluentProvider>
    );
};
