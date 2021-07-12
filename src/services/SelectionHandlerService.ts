import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import { interactivityUtils } from 'powerbi-visuals-utils-interactivityutils';
import getEvent = interactivityUtils.getEvent;

import Debugger, { standardLog } from '../Debugger';
import store from '../store';
import { ISelectionHandlerService } from '../types';
import { isContextMenuEnabled, isDataPointEnabled } from '../api/selection';
import { hostServices } from '../core/host';

const owner = 'SelectionHandlerService';

export class SelectionHandlerService implements ISelectionHandlerService {
    constructor() {
        Debugger.log(`Instantiating new ${owner}...`);
    }

    @standardLog({ owner, profile: true, report: true })
    handleDataPoint(name: string, selection: any) {
        Debugger.log('Data point click', name, selection);
        const {
                allowInteractions,
                dataset,
                settings
            } = store.getState().visual,
            { vega } = settings,
            { selectionManager } = hostServices,
            isSelectionEnabled =
                isDataPointEnabled &&
                vega.enableSelection &&
                allowInteractions &&
                vega.provider === 'vegaLite';

        if (isSelectionEnabled) {
            const fields =
                Object.keys(selection)?.filter((f) => f !== 'vlMulti') || [];
            let selectionIds: ISelectionId[] = [];
            Debugger.log('Fields', fields);
            switch (true) {
                // If selection ID supplied, then we already have our list. We need to use the textual map and look it up,
                // as intial selections (when we want to restore them on update) in Vega-Lite don't support objects
                case fields.indexOf('__key__') !== -1: {
                    Debugger.log(
                        'Identity already in datum. No need to search.'
                    );
                    selectionIds = selection.__key__
                        .map(
                            (k: string) =>
                                dataset.values.find((v) => v.__key__ === k)
                                    ?.__identity__
                        )
                        .filter((id: ISelectionId) => id !== undefined);
                    break;
                }
            }
            Debugger.log('Selection IDs', selectionIds);
            const existingSelectionIds = selectionManager.getSelectionIds(),
                rawSelectionIds = JSON.stringify(
                    selectionIds.map((sid) => sid.getSelector())
                ),
                rawExistingSelectionIDs = JSON.stringify(
                    existingSelectionIds.map((sid: ISelectionId) =>
                        sid.getSelector()
                    )
                );
            Debugger.log('Existing selections', existingSelectionIds);
            Debugger.log('Existing selections (raw)', rawExistingSelectionIDs);
            Debugger.log('Selections to apply (raw)', rawSelectionIds);
            switch (true) {
                case rawExistingSelectionIDs === rawSelectionIds: {
                    Debugger.log(
                        'Skipping selection, as this selection is already applied.'
                    );
                    return;
                }
                case selectionIds.length > 0: {
                    Debugger.log('Applying selections...');
                    selectionManager.select(selectionIds);
                    Debugger.log(
                        'Selections applied.',
                        selectionManager.getSelectionIds()
                    );
                    return;
                }
                default: {
                    Debugger.log('Clearing selections...');
                    selectionManager.clear();
                    Debugger.log('Selections cleared.');
                    return;
                }
            }
        } else {
            Debugger.log('Selection is disabled. Skipping over...');
        }
    }

    @standardLog()
    handleContextMenu(name: string, selection: any) {
        Debugger.log('Context menu click', selection);
        const {
                allowInteractions,
                settings
            } = store.getState().visual,
            { vega } = settings,
            { selectionManager } = hostServices,
            mouseEvent: MouseEvent =
                <MouseEvent>getEvent() || <MouseEvent>window.event,
            selectionId =
                vega.provider === 'vega'
                    ? <ISelectionId>selection?.__identity__
                    : <ISelectionId>selection?.__identity__[0]; // array for VL
        Debugger.log('Selection ID', selectionId);
        mouseEvent && mouseEvent.preventDefault();
        mouseEvent &&
            isContextMenuEnabled &&
            vega.enableContextMenu &&
            allowInteractions &&
            selectionManager.showContextMenu(selectionId, {
                x: mouseEvent.clientX,
                y: mouseEvent.clientY
            });
        Debugger.log('Context menu should now be visible..?');
    }
}
