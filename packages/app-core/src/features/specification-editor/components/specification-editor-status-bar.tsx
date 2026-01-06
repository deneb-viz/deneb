import { Caption1, makeStyles } from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import { monaco } from '../../../components/code-editor/monaco-integration';
import { StatusBarContainer } from '../../../components/ui';
import { ProviderDetail } from './provider-detail';
import { TrackingSyncStatus } from './tracking-sync-status';
import { getDenebState, useDenebState } from '../../../state';

type SpecificationEditorStatusBarProps = {
    position: monaco.Position;
    selectedText: string;
};

const useStatusStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        columnGap: '5px',
        height: '100%',
        width: '100%'
    },
    status: {
        display: 'flex',
        flexDirection: 'row',
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        columnGap: '10px',
        height: '100%'
    },
    cursorContainer: {
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    caption: {
        whiteSpace: 'nowrap'
    }
});

/**
 * Represents the status bar at the bottom of the editor.
 */
export const SpecificationEditorStatusBar = ({
    position,
    selectedText
}: SpecificationEditorStatusBarProps) => {
    const classes = useStatusStyles();
    const row = position.lineNumber;
    const column = position.column;
    const translate = useDenebState((state) => state.i18n.translate);
    logRender('JsonEditorStatusBar');
    return (
        <StatusBarContainer
            nearItems={
                <div className={classes.container}>
                    <ProviderDetail />
                </div>
            }
            farItems={
                <div className={classes.status}>
                    <TrackingSyncStatus />
                    <div className={classes.cursorContainer}>
                        <Caption1 className={classes.caption}>
                            {translate('Text_Editor_Status_Bar_Line')} {row}{' '}
                            {translate('Text_Editor_Status_Bar_Column')}{' '}
                            {column} {getSelectedTextMessage(selectedText)}
                        </Caption1>
                    </div>
                    <div className='status-settings'></div>
                </div>
            }
        />
    );
};

/**
 * Handles display of the correct message when the user has selected text.
 */
const getSelectedTextMessage = (selectedText: string) => {
    const selectionLength = selectedText.length;
    const { translate } = getDenebState().i18n;
    return selectionLength > 0
        ? translate('Text_Editor_Status_Bar_Selection', [selectionLength])
        : '';
};
