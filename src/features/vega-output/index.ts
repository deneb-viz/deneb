import { makeStyles, shorthands } from '@fluentui/react-components';

export { VegaContainer } from './components/vega-container';

/**
 * Styling specific to vega component display.
 */
export const useVegaStyles = makeStyles({
    vegaContainer: {
        height: '100%',
        minHeight: '100%',
        width: '100%',
        minWidth: '100%',
        display: 'flex'
    },
    overflowVisible: { ...shorthands.overflow('visible') },
    overflowOverlay: {
        ...shorthands.overflow('overlay')
    },
    vegaRender: {
        height: 'calc(100% - 4px)',
        width: 'calc(100% - 4px)'
    }
});
