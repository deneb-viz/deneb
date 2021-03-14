import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;

import Debugger, { standardLog } from '../Debugger';
import { splitPaneDefaults, visualViewportAdjust } from '../config';
import store from '../store';
import {
    TVisualInterface,
    IVisualSliceState,
    IRenderingService,
    TEditorPosition
} from '../types';

const owner = 'RenderingService';

export class RenderingService implements IRenderingService {
    constructor() {
        Debugger.log(`Instantiating new ${owner}...`);
    }

    @standardLog()
    resolveInterfaceType(state: IVisualSliceState) {
        switch (true) {
            case state.dataViewFlags.hasValidDataViewMapping &&
                state.viewMode === ViewMode.Edit &&
                state.editMode === EditMode.Advanced &&
                state.isInFocus: {
                return 'Edit';
            }
            case !state.dataViewFlags.hasValidDataViewMapping: {
                return 'Landing';
            }
            default: {
                return 'View';
            }
        }
    }

    @standardLog()
    getDefaultEditorPaneWidthInPx(
        viewport: IViewport,
        position: TEditorPosition
    ) {
        if (position === 'right') {
            return viewport.width * (1 - splitPaneDefaults.defaultSizePercent);
        }
        return viewport.width * splitPaneDefaults.defaultSizePercent;
    }

    @standardLog()
    resolveEditorPaneSize(
        editorPaneExpandedWidth: number,
        editorPaneIsExpanded: boolean,
        viewport: IViewport,
        position: TEditorPosition
    ) {
        const collapsedSize =
                position === 'right'
                    ? viewport.width - splitPaneDefaults.collapsedSize
                    : splitPaneDefaults.collapsedSize,
            resolvedWidth =
                (editorPaneIsExpanded && editorPaneExpandedWidth) ||
                (editorPaneIsExpanded &&
                    this.getDefaultEditorPaneWidthInPx(viewport, position)) ||
                collapsedSize;
        Debugger.log(`Pane width resolved as ${resolvedWidth}px`);
        return resolvedWidth;
    }

    @standardLog()
    resolveEditorPaneMinSize() {
        Debugger.log('Resolving minimum size for pane...');
        const {
                editorPaneIsExpanded,
                settings,
                viewport
            } = store.getState().visual,
            { editor } = settings,
            { minSize, maxSizePercent, collapsedSize } = splitPaneDefaults;
        let resolvedCollapsedSize =
                editor.position === 'right'
                    ? viewport.width - collapsedSize
                    : collapsedSize,
            resolvedMinSize =
                editor.position === 'right'
                    ? viewport.width * (1 - maxSizePercent)
                    : minSize,
            resolvedSize =
                (editorPaneIsExpanded && resolvedMinSize) ||
                resolvedCollapsedSize;
        Debugger.log(`Resolved size: ${resolvedSize}px`);
        return resolvedSize;
    }

    @standardLog()
    resolveEditorPaneMaxSize() {
        Debugger.log('Resolving maximum size for pane...');
        const {
                editorPaneIsExpanded,
                settings,
                viewport
            } = store.getState().visual,
            { editor } = settings,
            { maxSizePercent, minSize, collapsedSize } = splitPaneDefaults,
            resolvedSize =
                (editorPaneIsExpanded &&
                    (editor.position === 'right'
                        ? viewport.width - minSize
                        : viewport.width * maxSizePercent)) ||
                collapsedSize;
        Debugger.log(`Resolved size: ${resolvedSize}px`);
        return resolvedSize;
    }

    @standardLog()
    calculateVegaViewport(
        viewport: IViewport,
        editorPaneWidth: number,
        interfaceType: TVisualInterface,
        position: TEditorPosition
    ) {
        let { height } = viewport,
            width =
                (interfaceType === 'Edit' &&
                    (position === 'right'
                        ? editorPaneWidth
                        : viewport.width - editorPaneWidth)) ||
                viewport.width;
        height -= visualViewportAdjust.top;
        width -= visualViewportAdjust.left;
        return { width, height };
    }
}
