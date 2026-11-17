import {
    Button,
    FluentProvider,
    makeStyles,
    tokens
} from '@fluentui/react-components';
import {
    ChevronDown16Regular,
    ChevronUp16Regular
} from '@fluentui/react-icons';
import {
    getHeldValue,
    type BoundSignal
} from '@deneb-viz/vega-runtime/spec-processing';

import { getDenebTheme } from '../../../../lib/interface/theme';
import { useDenebState } from '../../../../state';
import { BindingControl } from './binding-control';
import { useBoundSignalSession } from './use-bound-signal-session';

/**
 * The pane always uses the light theme, so it looks the same in the editor
 * preview as it does in the report.
 */
const PANE_THEME = getDenebTheme('light');

const useBindingsPaneStyles = makeStyles({
    pane: {
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
        borderTopColor: tokens.colorNeutralStroke2,
        borderTopStyle: 'solid',
        borderTopWidth: tokens.strokeWidthThin,
        boxSizing: 'border-box',
        columnGap: tokens.spacingHorizontalS,
        display: 'flex',
        flexBasis: 'auto',
        flexGrow: 0,
        flexShrink: 0,
        // The pane never takes more than this share of the visual; beyond
        // it, the pane scrolls and the chart keeps the rest.
        maxHeight: '40%',
        overflowY: 'auto',
        paddingBottom: tokens.spacingVerticalXS,
        paddingLeft: tokens.spacingHorizontalS,
        paddingRight: tokens.spacingHorizontalXS,
        paddingTop: tokens.spacingVerticalXS
    },
    controls: {
        columnGap: tokens.spacingHorizontalL,
        display: 'flex',
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        flexWrap: 'wrap',
        minWidth: 0,
        rowGap: tokens.spacingVerticalXS
    },
    collapsedToggle: {
        backgroundColor: 'transparent',
        bottom: tokens.spacingVerticalXS,
        position: 'absolute',
        right: tokens.spacingHorizontalXS,
        zIndex: 1
    }
});

type BindingsPaneProps = {
    boundSignals: BoundSignal[];
    /** Whether the viewer instance that owns this pane is the live one. */
    isActive: boolean;
};

/**
 * The controls for a spec's bound signals. It sits beside the scroll
 * container, never inside it, so the chart is sized to the space it leaves.
 * When collapsed it leaves the layout, and its toggle alone overlays the
 * chart to bring it back.
 */
export const BindingsPane = ({ boundSignals, isActive }: BindingsPaneProps) => {
    const classes = useBindingsPaneStyles();
    const { heldValues, isPaneCollapsed, setIsPaneCollapsed, translate } =
        useDenebState((state) => ({
            heldValues: state.bindings.heldValues,
            isPaneCollapsed: state.bindings.isPaneCollapsed,
            setIsPaneCollapsed: state.bindings.setIsPaneCollapsed,
            translate: state.i18n.translate
        }));
    const writeBoundSignal = useBoundSignalSession(isActive);

    // One root and one toggle for both states. The toggle keeps its place
    // among the children, so it keeps keyboard focus when the pane collapses
    // or expands.
    return (
        <FluentProvider
            theme={PANE_THEME}
            className={isPaneCollapsed ? classes.collapsedToggle : classes.pane}
            role={isPaneCollapsed ? undefined : 'group'}
            aria-label={
                isPaneCollapsed ? undefined : translate('Text_Bindings_Pane')
            }
        >
            {!isPaneCollapsed && (
                <div className={classes.controls}>
                    {boundSignals.map((boundSignal) => (
                        <BindingControl
                            key={boundSignal.name}
                            boundSignal={boundSignal}
                            value={getHeldValue(boundSignal, heldValues)}
                            onChange={writeBoundSignal}
                        />
                    ))}
                </div>
            )}
            <Button
                appearance='subtle'
                size='small'
                icon={
                    isPaneCollapsed ? (
                        <ChevronUp16Regular />
                    ) : (
                        <ChevronDown16Regular />
                    )
                }
                aria-expanded={!isPaneCollapsed}
                aria-label={translate(
                    isPaneCollapsed
                        ? 'Button_Bindings_Show'
                        : 'Button_Bindings_Hide'
                )}
                onClick={() => setIsPaneCollapsed(!isPaneCollapsed)}
            />
        </FluentProvider>
    );
};
