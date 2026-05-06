import { useLayoutEffect, useMemo } from 'react';
import {
    Label,
    useId,
    Select,
    SelectProps,
    makeStyles,
    tokens
} from '@fluentui/react-components';

import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../../state';
import { getAvailableDatasetNames } from './dataset-discovery';

const useDatasetSelectStyles = makeStyles({
    statusBar: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalMNudge,
        height: '100%'
    }
});

/**
 * Headless component that ensures the dataset name is initialized when the Vega view is ready. This runs before
 * `DataTab` renders to avoid the chicken-and-egg problem where `DataTab` needs a dataset name, but
 * `DatasetSelect` (which sets it) only renders after data is loaded.
 *
 * @remarks We only reset the dataset name when:
 *
 * 1. The view is ready (`viewReady = true`) - ensures datasets are populated
 * 2. The current `datasetName` is empty OR not in the available datasets
 *
 * This prevents resetting the user's selection when the view is still initializing.
 *
 * Uses `useLayoutEffect` (not `useEffect`) so the dataset-name reset
 * commits synchronously before the browser paints. With `useEffect`, the
 * Data tab's first render would commit and paint with `datasetName === ''`
 * before this effect ran — surfacing as a one-frame flash of "Dataset ''
 * is not available..." or a brief stale-name dropdown value. Layout-effect
 * timing collapses that to a single visible state.
 */
export const DatasetSelectInitializer = () => {
    const { renderId, datasetName, setDataset, viewReady } = useDenebState(
        (state) => ({
            renderId: state.interface.renderId,
            datasetName: state.debug.datasetName,
            setDataset: state.debug.setDatasetName,
            viewReady: state.compilation.viewReady
        })
    );
    const datasets = useMemo(
        () => (viewReady ? getAvailableDatasetNames() : []),
        [renderId, viewReady]
    );

    useLayoutEffect(() => {
        // Only initialize when view is ready to avoid resetting during transitions
        if (!viewReady) {
            logDebug(
                'DatasetSelectInitializer: view not ready, skipping initialization'
            );
            return;
        }

        if (
            datasets.length > 0 &&
            (!datasetName || !datasets.includes(datasetName))
        ) {
            logDebug('DatasetSelectInitializer: setting initial dataset', {
                datasets,
                current: datasetName,
                first: datasets[0]
            });
            setDataset(datasets[0]);
        } else {
            logDebug('DatasetSelectInitializer: dataset already valid', {
                datasets,
                current: datasetName
            });
        }
    }, [datasets, datasetName, setDataset, viewReady]);

    return null; // Renders nothing - just handles initialization
};

/**
 * Provides the ability to select a dataset from the Vega view. Renders no
 * options when the view exposes no addressable named datasets — that case
 * is surfaced via the Data tab's `'no-datasets'` empty-state, which
 * suppresses this selector entirely (`shouldEmbedDatasetSelect`), so the
 * user is never presented with an option-less dropdown.
 *
 * @remarks Dataset initialization is handled by `DatasetSelectInitializer`. This component only handles user selection
 * changes. We deliberately don't have an effect here that resets the dataset name, as that caused duplicate resets
 * that would override user selections.
 */
export const DatasetSelect = () => {
    const { renderId, datasetName, setDataset, translate, viewReady } =
        useDenebState((state) => ({
            renderId: state.interface.renderId,
            datasetName: state.debug.datasetName,
            setDataset: state.debug.setDatasetName,
            translate: state.i18n.translate,
            viewReady: state.compilation.viewReady
        }));
    const datasetSelectId = useId();
    const classes = useDatasetSelectStyles();
    const datasets = useMemo(
        () => (viewReady ? getAvailableDatasetNames() : []),
        [renderId, viewReady]
    );
    const datasetOptions = useMemo(
        () =>
            datasets.map((ds) => (
                <option key={`dataset-${ds}`} value={ds}>
                    {ds}
                </option>
            )),
        [datasets]
    );

    const handleDatasetChange: SelectProps['onChange'] = (event, data) =>
        setDataset(data.value);

    logRender('DatasetViewerOptions', { renderId });
    return (
        <div className={classes.statusBar}>
            <div>
                <Label htmlFor={datasetSelectId} size='small'>
                    {translate('Text_Data_Table_Dataset_Label')}
                </Label>
            </div>
            <div>
                <Select
                    id={datasetSelectId}
                    value={datasetName}
                    onChange={handleDatasetChange}
                    size='small'
                >
                    {datasetOptions}
                </Select>
            </div>
        </div>
    );
};

