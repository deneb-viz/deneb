import { useRef } from 'react';
import { Button, Caption1, makeStyles, Tooltip } from '@fluentui/react-components';
import { ChevronDownRegular, CodeRegular } from '@fluentui/react-icons';

import { logRender } from '@deneb-viz/utils/logging';
import { StatusBarContainer } from '../../../components/ui';
import { ProviderDetail } from './provider-detail';
import { TrackingSyncStatus } from './tracking-sync-status';
import { getDenebState, useDenebState } from '../../../state';
import { useCursorContext } from '../../../context';
import { useStatusBarBreakpoint } from '../hooks/use-status-bar-breakpoint';

const CHEVRON_BUTTON_WIDTH = 28;

const useStatusStyles = makeStyles({
    wrapper: {
        width: '100%',
        height: '100%'
    },
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
    const containerRef = useRef<HTMLDivElement>(null);
    const layoutState = useStatusBarBreakpoint(containerRef);
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
    const showProvider = layoutState === 'wide' || layoutState === 'medium';
    const showActionButton =
        isVegaLite &&
        !isCompiledVegaPaneVisible &&
        layoutState !== 'veryNarrow';
    const showActionButtonText = layoutState === 'wide';

    const handleCollapse = () => {
        toggleCompiledVegaPane();
    };

    logRender('JsonEditorStatusBar');
    return (
        <div ref={containerRef} className={classes.wrapper}>
            <StatusBarContainer
                nearItems={
                    showProvider ? (
                        <div className={classes.nearContainer}>
                            <ProviderDetail
                                tooltipMountNode={tooltipMountNode}
                            />
                        </div>
                    ) : undefined
                }
                centerItems={
                    showActionButton ? (
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
                                {showActionButtonText
                                    ? translate('Text_Compiled_Vega_Toggle')
                                    : undefined}
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
        </div>
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
