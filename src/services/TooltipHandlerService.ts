import powerbi from 'powerbi-visuals-api';
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import { TooltipHandler } from 'vega-typings';
import { View } from 'vega-typings';

import Debugger from '../Debugger';
import { ITooltipHandlerService } from '../types';

const owner = 'TooltipHandlerService';

/**
 * The tooltip handler class.
 */
export class TooltipHandlerService implements ITooltipHandlerService {
    public call: TooltipHandler;

    private tooltipService: ITooltipService;

    /**
     * Create the tooltip handler and initialize the element and style.
     *
     * @param options Tooltip Options
     */
    constructor(tooltipService: ITooltipService) {
        Debugger.log(`Instantiating [${owner}]`);
        this.tooltipService = tooltipService;
        this.call = this.tooltipHandler.bind(this);
    }

    /**
     * The tooltip handler function. If this can't resolve directly from the data point, it will display a standard tooltip
     */
    private tooltipHandler(
        handler: any,
        event: MouseEvent,
        item: any,
        value: any
    ) {
        Debugger.log('Tooltip handler called!', handler, event, item, value);

        const datum = item?.datum,
            dataItems: VisualTooltipDataItem[] = Object.entries(item.tooltip)
                .filter(
                    ([ttk, ttv]) => ttk !== '__identity__' && ttk !== '__key__'
                )
                .map(([ttk, ttv]) => ({
                    displayName: `${ttk}`,
                    value: `${ttv}`
                })),
            coordinates: number[] = [event.clientX, event.clientY],
            isTouchEvent = false,
            identities = (datum?.__identity__ && [datum.__identity__]) || null;

        Debugger.log('Items', dataItems);
        Debugger.log('Identities', identities);

        switch (event.type) {
            case 'mouseover':
            case 'mousemove': {
                this.tooltipService.show({
                    coordinates: coordinates,
                    dataItems: dataItems,
                    isTouchEvent: isTouchEvent,
                    identities: identities
                });
                break;
            }
            case 'mouseout': {
                this.tooltipService.hide({
                    immediately: true,
                    isTouchEvent: false
                });
            }
        }
    }
}

/**
 * Create a tooltip handler and register it with the provided view.
 *
 * @param {View}            view      - The Vega view.
 * @param {ITooltipService} visualApi - Tooltip service.
 */
export default function (view: View, tooltipService: ITooltipService) {
    const handler = new TooltipHandlerService(tooltipService);

    view.tooltip(handler.call).run();

    return handler;
}
