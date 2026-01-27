import {
    type CSSProperties,
    type HTMLProps,
    useEffect,
    useMemo,
    useState
} from 'react';
import { useThrottle } from '@uidotdev/usehooks';
import { mergeClasses } from '@fluentui/react-components';
import { Scrollbars, type positionValues } from 'react-custom-scrollbars-2';

import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { getSignalPbiContainer } from '@deneb-viz/powerbi-compat/signals';
import { logRender } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { makeStyles } from '@fluentui/react-components';
import { VegaRender } from './vega-render';
import { VEGA_CONTAINER_ID } from '../constants';
import { getDenebState, useDenebState } from '../../../state';
import { useDenebPlatformProvider } from '../../deneb-platform';

const useVisualViewerStyles = makeStyles({
    container: {
        height: '100%',
        minHeight: '100%',
        width: '100%',
        minWidth: '100%',
        display: 'flex'
    },
    overflowVisible: { overflow: 'visible' },
    overflowOverlay: {
        overflow: 'overlay'
    }
});

type VisualViewerProps = {
    isEmbeddedInEditor?: boolean;
};

/**
 * Master component for hosting Vega content. We will handle the workflow
 * around memoisation of UI-specific dependencies here, so that we don't
 * compute more re-renders than we need to.
 */
// eslint-disable-next-line max-lines-per-function
export const VisualViewer = ({ isEmbeddedInEditor }: VisualViewerProps) => {
    const {
        config,
        spec,
        locale,
        logLevel,
        previewScrollbars,
        provider,
        renderMode,
        scrollbarColor,
        scrollbarOpacity,
        scrollbarRadius,
        scrollEventThrottle,
        specification,
        values,
        viewportHeight,
        viewportWidth
    } = useDenebState((state) => ({
        spec: state.project.spec,
        config: state.project.config,
        locale: state.i18n.locale,
        logLevel: state.project.logLevel,
        previewScrollbars:
            state.editorPreferences.previewAreaShowScrollbarsOnOverflow,
        provider: state.project.provider as SpecProvider,
        renderMode: state.project.renderMode,
        scrollbarColor: state.visualRender.scrollbarColor,
        scrollbarOpacity: state.visualRender.scrollbarOpacity,
        scrollbarRadius: state.visualRender.scrollbarRadius,
        scrollEventThrottle: state.visualRender.scrollEventThrottle,
        specification: state.specification,
        values: state.dataset.values,
        viewportHeight: state.interface.embedViewport?.height ?? 0,
        viewportWidth: state.interface.embedViewport?.width ?? 0
    }));
    const useScrollbars = useMemo(
        () => !isEmbeddedInEditor || previewScrollbars,
        [
            isEmbeddedInEditor,
            previewScrollbars,
            scrollbarColor,
            scrollbarOpacity,
            scrollbarRadius
        ]
    );
    const [scrollFrame, setScrollFrame] = useState<positionValues | null>(null);
    const throttledScrollFrame = useThrottle(scrollFrame, scrollEventThrottle);
    const classes = useVisualViewerStyles();
    const {
        onRenderingError,
        onRenderingFinished,
        onRenderingStarted,
        tooltipHandler,
        vegaLoader,
        viewEventBinders
    } = useDenebPlatformProvider();
    const containerClassName = mergeClasses(
        !isEmbeddedInEditor ? classes.overflowOverlay : classes.overflowVisible,
        classes.container
    );
    // Don't render VegaRender until we have valid viewport dimensions and spec
    // This prevents rendering issues during mode transitions when embedViewport
    // hasn't been synced yet or when the spec is not ready
    const hasValidViewport = viewportHeight > 0 && viewportWidth > 0;
    const hasValidSpec =
        specification.spec !== null && specification.status === 'valid';
    const canRender = hasValidViewport && hasValidSpec;
    const vegaComponent = canRender ? (
        <VegaRender
            locale={locale}
            logLevel={logLevel as number}
            onRenderingError={onRenderingError}
            onRenderingFinished={onRenderingFinished}
            onRenderingStarted={onRenderingStarted}
            provider={provider}
            renderMode={renderMode}
            specification={specification}
            tooltipHandler={tooltipHandler}
            values={values}
            vegaLoader={vegaLoader}
            viewEventBinders={viewEventBinders}
            viewportHeight={viewportHeight}
            viewportWidth={viewportWidth}
        />
    ) : null;
    useEffect(() => {
        logRender('VegaContainer', {
            isEmbeddedInEditor,
            hasValidViewport,
            hasValidSpec,
            canRender,
            specStatus: specification.status,
            config,
            spec,
            provider,
            specification,
            viewportHeight,
            viewportWidth
        });
    }, [
        isEmbeddedInEditor,
        config,
        spec,
        provider,
        specification.hashValue,
        viewportHeight,
        viewportWidth
    ]);

    useEffect(() => {
        if (!throttledScrollFrame) return;
        const container = VegaViewServices?.getView()?.container();
        const signal = getSignalPbiContainer({
            scroll: {
                height: container?.clientHeight ?? 0,
                width: container?.clientWidth ?? 0,
                scrollHeight: container?.scrollHeight ?? 0,
                scrollWidth: container?.scrollWidth ?? 0,
                scrollTop: throttledScrollFrame.scrollTop,
                scrollLeft: throttledScrollFrame.scrollLeft
            }
        });
        VegaViewServices.setSignalByName(signal.name, signal.value);
    }, [throttledScrollFrame]);
    return useScrollbars ? (
        <Scrollbars
            id={VEGA_CONTAINER_ID}
            className={containerClassName}
            renderThumbHorizontal={scrollbarThumbHorizontal}
            renderThumbVertical={scrollbarThumbVertical}
            onScrollFrame={(e: positionValues) => setScrollFrame(e)}
        >
            {vegaComponent}
        </Scrollbars>
    ) : (
        <>{vegaComponent}</>
    );
};

/**
 * Custom rendering for scrollbar vertical thumb.
 */
const scrollbarThumbVertical = (props: HTMLProps<HTMLDivElement>) =>
    getScrollBarThumb(props, { width: '100%' });

/**
 * Custom rendering for scrollbar horizontal thumb.
 */
const scrollbarThumbHorizontal = (props: HTMLProps<HTMLDivElement>) =>
    getScrollBarThumb(props, { height: '100%' });

/**
 * Generic scrollbar thumb component.
 */
const getScrollBarThumb = (
    props: HTMLProps<HTMLDivElement>,
    style: CSSProperties
) => {
    const { scrollbarRadius, scrollbarColor, scrollbarOpacity } =
        getDenebState().visualRender;
    const backgroundColor = addAlpha(scrollbarColor, scrollbarOpacity / 100);
    return (
        <div
            {...props}
            className='thumb-horizontal'
            style={{
                ...{
                    backgroundColor,
                    borderRadius: scrollbarRadius
                },
                ...style
            }}
        />
    );
};

/**
 * For a hex value, add the corresponding opacity value to the end, adjusted
 * based on the value.
 */
const addAlpha = (color: string, opacity: number) => {
    const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
    return `${color}${_opacity.toString(16)}`;
};
