import { Button, Caption1, makeStyles, Tooltip } from '@fluentui/react-components';
import { ChevronDownRegular, CodeRegular } from '@fluentui/react-icons';

import { logRender } from '@deneb-viz/utils/logging';
import { StatusBarContainer } from '../../../components/ui';
import { ProviderDetail } from './provider-detail';
import { TrackingSyncStatus } from './tracking-sync-status';
import { getDenebState, useDenebState } from '../../../state';
import { useCursorContext } from '../../../context';

const CHEVRON_BUTTON_WIDTH = 28;

const useStatusStyles = makeStyles({
    nearContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: '5px',
        height: '100%'
    },
    farContainer: {
        display: 'flex',
        flexDirection: 'row',
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
export const SpecificationEditorStatusBar = () => {
    const classes = useStatusStyles();
    const { cursor, tooltipMountNode } = useCursorContext();
    const {
        isCompiledVegaPaneVisible,
        provider,
        toggleCompiledVegaPane,
        translate
    } = useDenebState((state) => ({
        isCompiledVegaPaneVisible: state.editor.isCompiledVegaPaneVisible,
        provider: state.project.provider,
        toggleCompiledVegaPane: state.editor.toggleCompiledVegaPane,
        translate: state.i18n.translate
    }));
    const isVegaLite = provider === 'vegaLite';

    const handleCollapse = () => {
        toggleCompiledVegaPane();
    };

    logRender('JsonEditorStatusBar');
    return (
        <StatusBarContainer
            nearItems={
                <div className={classes.nearContainer}>
                    <ProviderDetail tooltipMountNode={tooltipMountNode} />
                </div>
            }
            centerItems={
                isVegaLite && !isCompiledVegaPaneVisible ? (
                    <Tooltip
                        relationship='description'
                        content={translate('Tooltip_Compiled_Vega_Toggle')}
                        withArrow
                        mountNode={tooltipMountNode}
                    >
                        <Button
                            appearance='subtle'
                            size='small'
                            icon={<CodeRegular />}
                            onClick={toggleCompiledVegaPane}
                        >
                            {translate('Text_Compiled_Vega_Toggle')}
                        </Button>
                    </Tooltip>
                ) : undefined
            }
            farItems={
                <div className={classes.farContainer}>
                    <TrackingSyncStatus />
                    <div className={classes.cursorContainer}>
                        <Caption1 className={classes.caption}>
                            {translate('Text_Editor_Status_Bar_Line')}{' '}
                            {cursor.lineNumber}{' '}
                            {translate('Text_Editor_Status_Bar_Column')}{' '}
                            {cursor.column}{' '}
                            {getSelectedTextMessage(cursor.selectedText)}
                        </Caption1>
                    </div>
                    <div
                        style={{
                            width: `${CHEVRON_BUTTON_WIDTH}px`,
                            flexShrink: 0
                        }}
                    >
                        {isVegaLite && isCompiledVegaPaneVisible && (
                            <Button
                                appearance='subtle'
                                size='small'
                                icon={<ChevronDownRegular />}
                                onClick={handleCollapse}
                            />
                        )}
                    </div>
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
