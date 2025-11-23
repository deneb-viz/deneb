import { Label, useId, Select, SelectProps } from '@fluentui/react-components';
import React, { useEffect, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import keys from 'lodash/keys';

import { useDebugStyles } from '..';
import store from '../../../store';
import { DEBUG_ROOT_DATASET_NAME } from '../../../constants';
import { VegaViewServices } from '../../vega-extensibility';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/dataset/data';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';

/**
 * Provides the ability to select a dataset from the Vega view. If no datasets
 * are available, then will default to and read from the visual.store dataset.
 */
export const DatasetViewerOptions: React.FC = () => {
    const { renderId, datasetName, setDataset } = store(
        (state) => ({
            renderId: state.interface.renderId,
            datasetName: state.debug.datasetName,
            setDataset: state.debug.setDatasetName
        }),
        shallow
    );
    const datasetSelectId = useId();
    const classes = useDebugStyles();
    const datasets = useMemo(() => getDatasetNames(), [renderId]);
    const datasetOptions = useMemo(
        () =>
            datasets.map((ds) => (
                <option key={`dataset-${ds}`} value={ds}>
                    {ds}
                </option>
            )),
        [datasets]
    );

    /**
     * If our datasets change and we no longer have our selected one in the
     * list, we should reset it to the default.
     */
    useEffect(() => {
        if (datasets.length > 0 && !datasets.includes(datasetName)) {
            setDataset(DATASET_DEFAULT_NAME);
        }
    }, [datasets]);

    const handleDatasetChange: SelectProps['onChange'] = (event, data) =>
        setDataset(data.value);

    logRender('DatasetViewerOptions', { renderId });
    return (
        <div className={classes.statusBarOptions}>
            <div>
                <Label htmlFor={datasetSelectId} size='small'>
                    {getI18nValue('Text_Data_Table_Dataset_Label')}
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
 * Gets the list of datasets that should be present in the Vega view. If none
 * can be found, the view is not bound, or the previously selected datset has
 * been removed, then we return the default dataset name.
 */
const getDatasetNames = () => {
    const datasets = keys(VegaViewServices.getAllData()).filter(
        (key) => key !== DEBUG_ROOT_DATASET_NAME
    );
    return (datasets.length === 0 ? [DATASET_DEFAULT_NAME] : datasets).map(
        (key) => key
    );
};
