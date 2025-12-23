import {type DatasetFields } from '@deneb-viz/data-core/field';
import {type VegaDatum} from '@deneb-viz/data-core/value';

export type TabularDataset = {
    fields: DatasetFields;
    values: VegaDatum[];
};
