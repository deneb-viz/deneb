import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;

import Debugger, { standardLog } from '../Debugger';
import store from '../store';
import {
    TVisualInterface,
    IVisualSliceState,
    IRenderingService,
    TEditorPosition
} from '../types';
import { getConfig } from '../api/config';

const owner = 'RenderingService';

export class RenderingService implements IRenderingService {
    private splitPaneDefaults = getConfig().splitPaneDefaults;
    private visualViewportAdjust = getConfig().visualViewPortAdjust;

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
    getResizablePaneDefaultWidth(
        viewport: IViewport,
        position: TEditorPosition
    ) {
        if (position === 'right') {
            return (
                viewport.width * (1 - this.splitPaneDefaults.defaultSizePercent)
            );
        }
        return viewport.width * this.splitPaneDefaults.defaultSizePercent;
    }

    @standardLog()
    getResizablePaneSize(
        paneExpandedWidth: number,
        editorPaneIsExpanded: boolean,
        viewport: IViewport,
        position: TEditorPosition
    ) {
        const collapsedSize =
                position === 'right'
                    ? viewport.width - this.splitPaneDefaults.collapsedSize
                    : this.splitPaneDefaults.collapsedSize,
            resolvedWidth =
                (editorPaneIsExpanded && paneExpandedWidth) ||
                (editorPaneIsExpanded &&
                    this.getResizablePaneDefaultWidth(viewport, position)) ||
                collapsedSize;
        Debugger.log(`Pane width resolved as ${resolvedWidth}px`);
        return resolvedWidth;
    }

    @standardLog()
    getResizablePaneMinSize() {
        Debugger.log('Resolving minimum size for pane...');
        const {
                editorPaneIsExpanded,
                settings,
                viewport
            } = store.getState().visual,
            { editor } = settings,
            { minSize, maxSizePercent, collapsedSize } = this.splitPaneDefaults;
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
    getResizablePaneMaxSize() {
        Debugger.log('Resolving maximum size for pane...');
        const {
                editorPaneIsExpanded,
                settings,
                viewport
            } = store.getState().visual,
            { editor } = settings,
            { maxSizePercent, minSize, collapsedSize } = this.splitPaneDefaults,
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
        paneWidth: number,
        interfaceType: TVisualInterface,
        position: TEditorPosition
    ) {
        let { height } = viewport,
            width =
                (interfaceType === 'Edit' &&
                    (position === 'right'
                        ? paneWidth
                        : viewport.width - paneWidth)) ||
                viewport.width;
        height -= this.visualViewportAdjust.top;
        width -= this.visualViewportAdjust.left;
        return { width, height };
    }
}
