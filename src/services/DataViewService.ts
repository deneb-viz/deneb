import powerbi from 'powerbi-visuals-api';
import DataView = powerbi.DataView;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewCategorical = powerbi.DataViewCategorical;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;

import {
    IDataViewService
} from '../types';
import Debugger, { standardLog } from '../Debugger';
import { selectionHandlerService, templateService } from '.';
import * as api from '../api';
import IVisualDataset = api.dataset.IVisualDataset;
import IVisualValueMetadata = api.dataset.IVisualValueMetadata;


const owner = 'DataViewService';

export class DataViewService implements IDataViewService {
    constructor() {
        Debugger.log(`Instantiating new ${owner}...`);
    }

    @standardLog()
    getEmptyDataset(): IVisualDataset {
        Debugger.log('Getting new empty dataset...');
        return {
            metadata: {},
            values: []
        };
    }

    @standardLog()
    getRowCount(categorical: DataViewCategorical) {
        Debugger.log('Counting data view rows...');
        return (
            categorical?.categories?.[0]?.values?.length ||
            categorical?.values?.[0]?.values?.length ||
            0
        );
    }

    @standardLog()
    validateDataViewRoles(dataViews?: DataView[], dataRoles: string[] = []) {
        let hasValidDataRoles = false;
        Debugger.log('Confirming specified data roles are present...');
        hasValidDataRoles = true;
        dataRoles?.forEach((dr) => {
            Debugger.log(`Checking for role: ${dr}...`);
            hasValidDataRoles =
                this.getDataRoleIndex(dataViews[0].metadata.columns, dr) > -1 &&
                hasValidDataRoles;
        });
        return hasValidDataRoles;
    }

    @standardLog({ profile: true, owner })
    getMappedDataset(categorical: DataViewCategorical): IVisualDataset {
        Debugger.log('Mapping data view into visual dataset...');
        Debugger.log('Initialising empty dataset...');
        const categories = categorical?.categories,
            values = categorical?.values,
            columns = [
                ...(categories?.map((c, ci) => ({
                    column: c.source,
                    source: 'categories',
                    sourceIndex: ci
                })) || []),
                ...(values?.map((v, vi) => ({
                    column: v.source,
                    source: 'values',
                    sourceIndex: vi
                })) || [])
            ],
            fieldValues = [
                ...(categories?.map((c) => c.values) || []),
                ...(values?.map((v) => v.values) || [])
            ],
            rowCount = this.getRowCount(categorical),
            hasData = rowCount > 0,
            dataset = this.getEmptyDataset(),
            metadata: IVisualValueMetadata = {};
        try {
            Debugger.log('Getting metadata for all dataView columns...');
            Debugger.log('Columns', columns);
            Debugger.log('Field Values', fieldValues);
            columns.forEach((c, ci) => {
                metadata[
                    `${api.dataView.encodeFieldForSpec(c.column.displayName)}`
                ] = {
                    ...c.column,
                    ...{
                        isColumn: !c.column.isMeasure,
                        sourceIndex: c.sourceIndex,
                        templateMetadata: templateService.resolveVisualMetaToDatasetField(
                            c.column
                        )
                    }
                };
            });
            Debugger.log('Getting data values...');
            if (hasData) {
                const rows = Array.apply(null, { length: rowCount }).map(
                        Number.call,
                        Number
                    ),
                    values = rows.map((r, ri) => {
                        let valueRow = {};
                        columns.forEach((c, ci) => {
                            const val = fieldValues[ci][ri],
                                base = c?.column.type.dateTime
                                    ? new Date(val.toString())
                                    : val,
                                value = base;
                            if (c?.column.roles?.dataset) {
                                valueRow[
                                    api.dataView.encodeFieldForSpec(
                                        c.column.displayName
                                    )
                                ] = value;
                            }
                        });
                        const identity = api.selection.createSelectionId(
                            metadata,
                            categories,
                            ri
                        );
                        return {
                            ...{
                                __identity__: identity,
                                __key__: selectionHandlerService.getSidString(
                                    identity
                                ),
                                identityIndex: ri
                            },
                            ...valueRow
                        };
                    });
                dataset.metadata = metadata;
                dataset.values = values;
            }
        } catch (e) {
            Debugger.log('Error mapping the dataset!', e);
        } finally {
            Debugger.log('Dataset', dataset);
            Debugger.log(`${dataset.values.length} rows in dataset.`);
            return dataset;
        }
    }

    @standardLog()
    validateDataViewMapping(dataViews?: DataView[]) {
        Debugger.log(
            'Testing [categorical] data view mapping has basic requirements...'
        );
        const result =
            (dataViews?.length > 0 &&
                dataViews[0]?.categorical &&
                dataViews[0]?.metadata?.columns &&
                true) ||
            false;
        Debugger.log(`Data view mapping validity = ${result}`);
        return result;
    }

    /**
     * Checks the supplied columns for the correct index of the content column, so that we can map it correctly later.
     *
     * @param columns   - Array of metadata columns from the Power BI data view.
     * @param role      - Name of data role to search for.
     */
    @standardLog()
    private getDataRoleIndex(columns: DataViewMetadataColumn[], role: string) {
        Debugger.log(`Searching dataView columns for role: ${role}...`);
        const result = columns.findIndex((c) => c.roles[`${role}`]);
        Debugger.log(`Role array index: ${result}`);
        return result;
    }
}
