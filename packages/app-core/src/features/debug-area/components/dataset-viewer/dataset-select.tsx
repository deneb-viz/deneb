import { useEffect, useMemo } from 'react';
import {
    Label,
    useId,
    Select,
    SelectProps,
    makeStyles,
    tokens
} from '@fluentui/react-components';

import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { useDenebState } from '../../../../state';

/**
 * The name of the root dataset that Vega generates, to filter out when deriving from the view.
 */
const DEBUG_ROOT_DATASET_NAME = 'root';

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
 * `DatasetViewer` renders to avoid the chicken-and-egg problem where `DatasetViewer` needs a dataset name, but
 * `DatasetSelect` (which sets it) only renders after data is loaded.
 *
 * @remarks We only reset the dataset name when:
 *
 * 1. The view is ready (`viewReady = true`) - ensures datasets are populated
 * 2. The current `datasetName` is empty OR not in the available datasets
 *
 * This prevents resetting the user's selection when the view is still initializing.
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
        () => (viewReady ? getDatasetNames() : []),
        [renderId, viewReady]
    );

    useEffect(() => {
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
 * Provides the ability to select a dataset from the Vega view. If no datasets are available, then will default to and
 * read from the visual.store dataset.
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
        () => (viewReady ? getDatasetNames() : []),
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

/**
 * Gets the list of datasets that should be present in the Vega view. If none can be found, the view is not bound, or
 * the previously selected dataset has been removed, then we return the default dataset name.
 */
const getDatasetNames = () => {
    const allData = VegaViewServices.getAllData();
    logDebug('DatasetSelect: getAllData result', {
        allData,
        keys: Object.keys(allData)
    });
    const datasets = Object.keys(allData).filter(
        (key) => key !== DEBUG_ROOT_DATASET_NAME
    );
    logDebug('DatasetSelect: filtered datasets', { datasets });
    return (datasets.length === 0 ? [DATASET_DEFAULT_NAME] : datasets).map(
        (key) => key
    );
};
