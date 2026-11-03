import { type ReactNode } from 'react';
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

const useImportContentStyles = makeStyles({
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
        minHeight: '200px',
        // app-core's template pane is full width plus its border, which
        // would otherwise overflow the content sideways.
        '& > div': { boxSizing: 'border-box' }
    },
    footer: {
        columnGap: tokens.spacingHorizontalS,
        display: 'flex',
        flexShrink: 0,
        justifyContent: 'flex-end'
    }
});

type ImportContentProps = {
    /** The buttons that finish the import. */
    footer: ReactNode;
};

/**
 * Import a template exported from Deneb and assign fields to its
 * placeholders, in the import dialog or in the tile where dialogs aren't
 * available.
 *
 * The import and placeholder content scrolls while the footer sits outside
 * it, so its buttons stay visible. The import and placeholder pieces are
 * app-core's, so their keyboard and focus behaviour match Deneb's create
 * dialog.
 */
export const ImportContent = ({ footer }: ImportContentProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useImportContentStyles();
    logRender('ImportContent');
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
            <div className={classes.footer}>{footer}</div>
        </FluentProvider>
    );
};
