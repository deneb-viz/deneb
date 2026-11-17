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
import {
    getCollapsedToggleCorner,
    isPaneAlongWidth,
    resolveIsPaneCollapsed,
    type CollapsedToggleCorner
} from '../../bindings-pane-state';
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

/**
 * The most width a row takes when its label sits beside its control. The
 * label takes a share of the row, so a row as wide as the visual would put
 * each label far from its control. In `em`, so that the rows widen with the
 * font size setting.
 */
const ROW_MAXIMUM_WIDTH = '28em';

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
    // One row for each signal, on every edge.
    controls: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
    },
    controlsAlongWidth: {
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        maxWidth: ROW_MAXIMUM_WIDTH,
        rowGap: tokens.spacingVerticalXS
    },
    // A label sits above its control here, so the gap between two rows is
    // wider than the gap between a label and its control, to show which
    // label belongs to which control.
    controlsAlongHeight: { rowGap: tokens.spacingVerticalM },
    // A Fluent button hides its overflow, so as a flex item it has no
    // minimum size of its own. Without this it is squeezed flat when the
    // controls overflow the pane.
    toggle: { flexShrink: 0 },
    // Above the stacked controls, at the end of its own row.
    toggleAlongHeight: { alignSelf: 'flex-end' },
    // After the rows, at the far end of the pane.
    toggleAlongWidth: { marginLeft: 'auto' },
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
    // Keyed on the style settings alone: the settings object can be new on
    // every compile, and a new theme makes Fluent rewrite its stylesheet.
    const { fontFamily, fontSize, color, accentColor } = settings;
    const theme = useMemo(
        () => getBindingsTheme({ fontFamily, fontSize, color, accentColor }),
        [fontFamily, fontSize, color, accentColor]
    );

    const { orient } = settings;
    const runsAlongWidth = isPaneAlongWidth(orient);
    const isCollapsed = resolveIsPaneCollapsed(settings, paneCollapseChoice);

    const collapsedCornerClasses: Record<CollapsedToggleCorner, string> = {
        bottomRight: classes.collapsedAtBottomRight,
        topRight: classes.collapsedAtTopRight,
        topLeft: classes.collapsedAtTopLeft
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
        collapsedCornerClasses[getCollapsedToggleCorner(orient)]
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

    const toggle = settings.collapsible && (
        <Button
            className={mergeClasses(
                classes.toggle,
                runsAlongWidth
                    ? classes.toggleAlongWidth
                    : classes.toggleAlongHeight
            )}
            appearance='subtle'
            size='small'
            icon={isCollapsed ? SHOW_ICONS[orient] : HIDE_ICONS[orient]}
            aria-expanded={!isCollapsed}
            aria-label={translate(
                isCollapsed ? 'Button_Bindings_Show' : 'Button_Bindings_Hide'
            )}
            onClick={() => setPaneCollapseChoice(!isCollapsed)}
        />
    );

    // One root and one toggle for both states and every orient. The toggle
    // is the first child when the controls are stacked, where it is drawn
    // above them, and the last when they run along the width, where it is
    // drawn after them, so the Tab key reaches it in the order it is drawn.
    // On any one edge it keeps its place among the children, so it keeps
    // keyboard focus when the pane collapses or expands.
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
            {!runsAlongWidth && toggle}
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
                            fieldOrientation={
                                runsAlongWidth ? 'horizontal' : 'vertical'
                            }
                            onChange={writeBoundSignal}
                        />
                    ))}
                </div>
            )}
            {runsAlongWidth && toggle}
        </FluentProvider>
    );
};
