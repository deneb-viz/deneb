import { makeStyles } from '@fluentui/react-components';
import { ArrowSortDown16Regular } from '@fluentui/react-icons';
import { tokens } from '@fluentui/react-theme';
import DataTable, { type TableProps } from 'react-data-table-component';
import { StyleSheetManager } from 'styled-components';

import { logRender } from '@deneb-viz/utils/logging';
import { DataTableStatusBar } from './data-table-status-bar';
import {
    DATA_TABLE_FONT_FAMILY,
    DATA_TABLE_FONT_SIZE,
    DATA_TABLE_ROW_HEIGHT,
    DATA_TABLE_ROW_PADDING_LEFT
} from '../../constants';
import { useDenebState } from '../../../../state';

const useDataTableStyles = makeStyles({
    enclosure: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        width: '100%'
    }
});

/**
 * Displays a table of data, either for a dataset or the signals in the Vega
 * view.
 */
// eslint-disable-next-line max-lines-per-function
export const DataTableViewer = ({
    columns,
    data,
    ...props
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: TableProps<any>) => {
    const { debugTableRowsPerPage } = useDenebState((state) => ({
        debugTableRowsPerPage: state.editorPreferences.dataViewerRowsPerPage
    }));
    const classes = useDataTableStyles();
    logRender('DataTableViewer');
    // Filter compact prop that RDT passes to column cells but shouldn't reach DOM
    const shouldForwardProp = (propName: string) => propName !== 'compact';
    return (
        <div className={classes.enclosure}>
            <StyleSheetManager shouldForwardProp={shouldForwardProp}>
                <DataTable
                    columns={columns}
                    data={data}
                    fixedHeader
                    sortIcon={<ArrowSortDown16Regular />}
                    defaultSortFieldId={columns[0].id}
                    pagination
                    paginationComponent={DataTableStatusBar}
                    paginationPerPage={debugTableRowsPerPage as number}
                    customStyles={{
                        head: {
                            style: {
                                color: tokens.colorNeutralForeground1,
                                fontWeight: 900
                            }
                        },
                        headRow: {
                            style: {
                                backgroundColor: tokens.colorNeutralBackground1,
                                borderBottomColor: tokens.colorNeutralStroke3,
                                borderBottomStyle: 'solid',
                                borderBottomWidth: '1px',
                                paddingLeft: `${DATA_TABLE_ROW_PADDING_LEFT}px`,
                                minHeight: `${DATA_TABLE_ROW_HEIGHT}px`
                            },
                            denseStyle: {
                                minHeight: `${DATA_TABLE_ROW_HEIGHT}px`
                            }
                        },
                        rows: {
                            style: {
                                backgroundColor: tokens.colorNeutralBackground1,
                                color: tokens.colorNeutralForeground2,
                                paddingLeft: `${DATA_TABLE_ROW_PADDING_LEFT}px`,
                                borderBottomColor: tokens.colorNeutralStroke3,
                                borderBottomStyle: 'solid',
                                borderBottomWidth: '1px',
                                minHeight: `${DATA_TABLE_ROW_HEIGHT}px`,
                                '&:not(:last-of-type)': {
                                    borderBottomColor:
                                        tokens.colorNeutralStroke3,
                                    borderBottomStyle: 'solid',
                                    borderBottomWidth: '1px'
                                }
                            },
                            denseStyle: {
                                minHeight: `${DATA_TABLE_ROW_HEIGHT}px`
                            }
                        },
                        cells: {
                            style: { fontSize: `${DATA_TABLE_FONT_SIZE}px` }
                        },
                        table: {
                            style: {
                                backgroundColor: tokens.colorNeutralBackground1,
                                boxSizing: 'border-box',
                                fontFamily: DATA_TABLE_FONT_FAMILY,
                                fontSize: `${DATA_TABLE_FONT_SIZE}px`
                            }
                        },
                        tableWrapper: {
                            style: {
                                height: '100%',
                                backgroundColor: tokens.colorNeutralBackground1
                            }
                        },
                        responsiveWrapper: {
                            style: {
                                flexGrow: 1,
                                overflow: 'overlay'
                            }
                        }
                    }}
                    dense
                    {...props}
                />
            </StyleSheetManager>
        </div>
    );
};
