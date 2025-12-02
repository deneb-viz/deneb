/**
 * Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.
 */
export type VegaDatum = {
    [key: string]: any;
};
