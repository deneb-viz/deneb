import powerbi from 'powerbi-visuals-api';
import DataView = powerbi.DataView;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewTable = powerbi.DataViewTable;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;

import {
    IDataViewService,
    IVisualDataset,
    IVisualValueMetadata,
    IVisualValueRow
} from '../types';
import Debugger, { standardLog } from '../Debugger';
import { selectionHandlerService } from '.';

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
    getRowCount(dataView: DataView) {
        Debugger.log('Counting data view rows...');
        return dataView?.table?.rows?.length || 0;
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
    getMappedDataset(
        table: DataViewTable,
        selectionIdBuilder: () => ISelectionIdBuilder
    ): IVisualDataset {
        Debugger.log('Mapping data view into visual dataset...');
        Debugger.log('Initialising empty dataset...');
        const columns = table.columns,
            rows = table.rows || [],
            hasData = rows.length > 0,
            dataset = this.getEmptyDataset(),
            metadata: IVisualValueMetadata = {};
        try {
            Debugger.log('Getting metadata for all dataView columns...');
            columns.forEach((c) => {
                metadata[`${c.displayName}`] = {
                    ...c,
                    ...{ isColumn: !c.isMeasure, isRaw: false }
                };
            });
            Debugger.log('Getting data values...');

            if (hasData) {
                const values = table.rows.map((r, ri) => {
                    const identity = selectionIdBuilder()
                        .withTable(table, ri)
                        .createSelectionId();
                    let valueRow: IVisualValueRow = {
                        __identity__: identity,
                        __key__: selectionHandlerService.getSidString(identity)
                    };
                    r.forEach((c, ci) => {
                        const col = columns[ci],
                            base = col?.type.dateTime
                                ? new Date(c.toString())
                                : c,
                            value = base;
                        if (col?.roles?.dataset) {
                            valueRow[col.displayName] = value;
                        }
                    });
                    return valueRow;
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
            'Testing [table] data view mapping has basic requirements...'
        );
        const result =
            (dataViews?.length > 0 &&
                dataViews[0]?.table &&
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
