import {
    Body1,
    FluentProvider,
    makeStyles,
    tokens
} from '@fluentui/react-components';

import {
    CreateButton,
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
        padding: tokens.spacingVerticalM,
        rowGap: tokens.spacingVerticalS,
        width: '100%'
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        overflow: 'auto',
        rowGap: tokens.spacingVerticalM
    },
    template: {
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        minHeight: '200px'
    },
    footer: {
        display: 'flex',
        flexShrink: 0,
        justifyContent: 'flex-end'
    }
});

/**
 * The authoring surface for a visual with no template: import a template
 * exported from Deneb, assign fields to its placeholders, then create.
 *
 * The import and placeholder content scrolls while the Create button sits
 * in a footer outside it, so the button stays visible in a small tile. The
 * import, placeholder and create pieces are app-core's, so their keyboard
 * and focus behaviour match Deneb's create dialog.
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
            <div className={classes.content}>
                <Body1>{translate('PowerBI_Viewer_Create_Overview')}</Body1>
                <ImportDropzone />
                <div className={classes.template}>
                    <CreateFromTemplate />
                </div>
            </div>
            <div className={classes.footer}>
                <CreateButton />
            </div>
        </FluentProvider>
    );
};
