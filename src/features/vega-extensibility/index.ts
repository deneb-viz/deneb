import { registerCustomSchemes } from './extensibility/schemes';

export { VegaPatternFillServices } from './pattern-fill';
export {
    VegaViewServices,
    getVegaLoader,
    handleNewView,
    handleViewError
} from './view';
export * from './extensibility';
