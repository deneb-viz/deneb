export * as vegaUtils from './vegaUtils';

// Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.
export interface IVegaViewDatum {
    [key: string]: any;
}
