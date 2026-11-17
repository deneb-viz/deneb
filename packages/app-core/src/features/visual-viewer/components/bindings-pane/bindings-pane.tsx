import { useMemo, type CSSProperties, type ReactElement } from 'react';
import {
    Button,
    FluentProvider,
    makeStyles,
    mergeClasses,
    tokens
} from '@fluentui/react-components';
import {
    ChevronDown16Regular,
    ChevronLeft16Regular,
    ChevronRight16Regular,
    ChevronUp16Regular
} from '@fluentui/react-icons';
import {
    getHeldValue,
    type BindingsOrient,
    type BindingsSettings,
    type BoundSignal
} from '@deneb-viz/vega-runtime/spec-processing';

import { getBindingsTheme } from '../../../../lib/interface/bindings-theme';
import { useDenebState } from '../../../../state';
import { resolveIsPaneCollapsed } from '../../bindings-pane-state';
import { BindingControl } from './binding-control';
import { useBoundSignalSession } from './use-bound-signal-session';

/**
 * The colour of the line between the pane and the chart. Set on the pane's
 * root from the `borderColor` setting, and read by whichever edge faces the
 * chart.
 */
const BORDER_COLOR_PROPERTY = '--deneb-bindings-border-color';
const BORDER_COLOR = `var(${BORDER_COLOR_PROPERTY})`;

/**
 * A pane never takes more than this share of the visual; beyond it, the
 * pane scrolls and the chart keeps the rest.
 */
const PANE_MAXIMUM_SHARE = '40%';

/** The pane background when the author sets none and the pane is inline. */
const INLINE_BACKGROUND = 'transparent';

/**
 * The pane background when the author sets none and the pane floats, so that
 * the controls stay legible over the chart.
 */
const FLOATING_BACKGROUND = '#ffffff';

const useBindingsPaneStyles = makeStyles({
    pane: {
        boxSizing: 'border-box',
        columnGap: tokens.spacingHorizontalS,
        display: 'flex',
        flexBasis: 'auto',
        flexGrow: 0,
        flexShrink: 0,
        overflowY: 'auto',
        paddingBottom: tokens.spacingVerticalXS,
        paddingLeft: tokens.spacingHorizontalS,
        paddingRight: tokens.spacingHorizontalXS,
        paddingTop: tokens.spacingVerticalXS,
        rowGap: tokens.spacingVerticalXS
    },
    paneAlongWidth: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        maxHeight: PANE_MAXIMUM_SHARE,
        width: '100%'
    },
    paneAlongHeight: {
        flexDirection: 'column',
        height: '100%',
        maxWidth: PANE_MAXIMUM_SHARE
    },
    borderForBottom: {
        borderTopColor: BORDER_COLOR,
        borderTopStyle: 'solid',
        borderTopWidth: tokens.strokeWidthThin
    },
    borderForTop: {
        borderBottomColor: BORDER_COLOR,
        borderBottomStyle: 'solid',
        borderBottomWidth: tokens.strokeWidthThin
    },
    borderForLeft: {
        borderRightColor: BORDER_COLOR,
        borderRightStyle: 'solid',
        borderRightWidth: tokens.strokeWidthThin
    },
    borderForRight: {
        borderLeftColor: BORDER_COLOR,
        borderLeftStyle: 'solid',
        borderLeftWidth: tokens.strokeWidthThin
    },
    float: { position: 'absolute', zIndex: 1 },
    floatAtBottom: { bottom: 0, left: 0 },
    floatAtTop: { left: 0, top: 0 },
    floatAtLeft: { left: 0, top: 0 },
    floatAtRight: { right: 0, top: 0 },
    controls: {
        columnGap: tokens.spacingHorizontalL,
        display: 'flex',
        minWidth: 0,
        rowGap: tokens.spacingVerticalXS
    },
    controlsAlongWidth: {
        flexBasis: 0,
        flexDirection: 'row',
        flexGrow: 1,
        flexShrink: 1,
        flexWrap: 'wrap'
    },
    controlsAlongHeight: { flexDirection: 'column' },
    // Shown above the stacked controls, without moving the toggle ahead of
    // them among the children.
    toggleAlongHeight: { alignSelf: 'flex-end', order: -1 },
    collapsedToggle: {
        backgroundColor: 'transparent',
        position: 'absolute',
        zIndex: 1
    },
    collapsedAtBottomRight: {
        bottom: tokens.spacingVerticalXS,
        right: tokens.spacingHorizontalXS
    },
    collapsedAtTopRight: {
        right: tokens.spacingHorizontalXS,
        top: tokens.spacingVerticalXS
    },
    collapsedAtTopLeft: {
        left: tokens.spacingHorizontalXS,
        top: tokens.spacingVerticalXS
    }
});

/** The chevron that points the way the pane will move when it is hidden. */
const HIDE_ICONS: Record<BindingsOrient, ReactElement> = {
    bottom: <ChevronDown16Regular />,
    top: <ChevronUp16Regular />,
    left: <ChevronLeft16Regular />,
    right: <ChevronRight16Regular />
};

/** The chevron that points the way the pane will move when it is shown. */
const SHOW_ICONS: Record<BindingsOrient, ReactElement> = {
    bottom: <ChevronUp16Regular />,
    top: <ChevronDown16Regular />,
    left: <ChevronRight16Regular />,
    right: <ChevronLeft16Regular />
};

type BindingsPaneProps = {
    boundSignals: BoundSignal[];
    /** Whether the viewer instance that owns this pane is the live one. */
    isActive: boolean;
    settings: BindingsSettings;
};

/**
 * The controls for a spec's bound signals, placed and styled by the
 * `deneb.bindings` settings.
 *
 * Inline, it sits beside the scroll container, never inside it, so the chart
 * is sized to the space it leaves. Floating, it overlays the chart on its
 * edge and takes no space. Collapsed, it leaves the layout, and its toggle
 * alone overlays the chart, in the corner nearest its edge, to bring it back.
 */
export const BindingsPane = ({
    boundSignals,
    isActive,
    settings
}: BindingsPaneProps) => {
    const classes = useBindingsPaneStyles();
    const { heldValues, paneCollapseChoice, setPaneCollapseChoice, translate } =
        useDenebState((state) => ({
            heldValues: state.bindings.heldValues,
            paneCollapseChoice: state.bindings.paneCollapseChoice,
            setPaneCollapseChoice: state.bindings.setPaneCollapseChoice,
            translate: state.i18n.translate
        }));
    const writeBoundSignal = useBoundSignalSession(isActive);
    const theme = useMemo(() => getBindingsTheme(settings), [settings]);

    const { orient } = settings;
    const runsAlongWidth = orient === 'top' || orient === 'bottom';
    const isCollapsed = resolveIsPaneCollapsed(settings, paneCollapseChoice);

    const collapsedCornerClasses: Record<BindingsOrient, string> = {
        bottom: classes.collapsedAtBottomRight,
        top: classes.collapsedAtTopRight,
        right: classes.collapsedAtTopRight,
        left: classes.collapsedAtTopLeft
    };
    const borderClasses: Record<BindingsOrient, string> = {
        bottom: classes.borderForBottom,
        top: classes.borderForTop,
        left: classes.borderForLeft,
        right: classes.borderForRight
    };
    const floatClasses: Record<BindingsOrient, string> = {
        bottom: classes.floatAtBottom,
        top: classes.floatAtTop,
        left: classes.floatAtLeft,
        right: classes.floatAtRight
    };

    const collapsedClassName = mergeClasses(
        classes.collapsedToggle,
        collapsedCornerClasses[orient]
    );
    const expandedClassName = mergeClasses(
        classes.pane,
        runsAlongWidth ? classes.paneAlongWidth : classes.paneAlongHeight,
        borderClasses[orient],
        settings.float && classes.float,
        settings.float && floatClasses[orient]
    );
    const defaultBackground = settings.float
        ? FLOATING_BACKGROUND
        : INLINE_BACKGROUND;
    const expandedStyle = {
        backgroundColor: settings.background ?? defaultBackground,
        [BORDER_COLOR_PROPERTY]:
            settings.borderColor ?? tokens.colorNeutralStroke2
    } as CSSProperties;

    // One root and one toggle for both states and every orient. The toggle
    // keeps its place among the children, so it keeps keyboard focus when
    // the pane collapses or expands.
    return (
        <FluentProvider
            theme={theme}
            className={isCollapsed ? collapsedClassName : expandedClassName}
            style={isCollapsed ? undefined : expandedStyle}
            role={isCollapsed ? undefined : 'group'}
            aria-label={
                isCollapsed ? undefined : translate('Text_Bindings_Pane')
            }
        >
            {!isCollapsed && (
                <div
                    className={mergeClasses(
                        classes.controls,
                        runsAlongWidth
                            ? classes.controlsAlongWidth
                            : classes.controlsAlongHeight
                    )}
                >
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
            {settings.collapsible && (
                <Button
                    className={
                        runsAlongWidth ? undefined : classes.toggleAlongHeight
                    }
                    appearance='subtle'
                    size='small'
                    icon={isCollapsed ? SHOW_ICONS[orient] : HIDE_ICONS[orient]}
                    aria-expanded={!isCollapsed}
                    aria-label={translate(
                        isCollapsed
                            ? 'Button_Bindings_Show'
                            : 'Button_Bindings_Hide'
                    )}
                    onClick={() => setPaneCollapseChoice(!isCollapsed)}
                />
            )}
        </FluentProvider>
    );
};
