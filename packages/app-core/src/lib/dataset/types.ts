import {
    DatasetValueRow,
    IDatasetFields
} from '@deneb-viz/powerbi-compat/dataset';

export type TabularDataset = {
    fields: IDatasetFields;
    // TODO: remove dependency on Power BI specific stuff and make this more generic; for now this will do
    values: DatasetValueRow[];
};
