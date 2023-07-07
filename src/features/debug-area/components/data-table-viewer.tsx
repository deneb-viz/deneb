import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { ArrowSortDown16Regular } from '@fluentui/react-icons';
import { tokens } from '@fluentui/react-theme';
import DataTable, { TableProps } from 'react-data-table-component';

import store from '../../../store';
import { DataTableStatusBar } from './data-table-status-bar';
import { DATA_TABLE_FONT_FAMILY, DATA_TABLE_FONT_SIZE } from '..';
import { logRender } from '../../logging';
import { getConfig } from '../../../core/utils/config';
import {
    ADVANCED_EDITOR_TOOLBAR_HEIGHT,
    PREVIEW_PANE_AREA_PADDING,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE
} from '../../../constants';

/**
 * Displays a table of data, either for a dataset or the signals in the Vega
 * view.
 */
export const DataTableViewer: React.FC<TableProps<any>> = ({
    columns,
    data,
    ...props
}) => {
    const { editorPreviewAreaHeight, viewportHeight } = store(
        (state) => ({
            editorPreviewAreaHeight: state.editorPreviewAreaHeight,
            viewportHeight: state.visualViewportCurrent.height
        }),
        shallow
    );
    const debugAreaHeight = useMemo(
        () =>
            viewportHeight -
            ADVANCED_EDITOR_TOOLBAR_HEIGHT -
            editorPreviewAreaHeight -
            PREVIEW_PANE_TOOLBAR_MIN_SIZE * 2 -
            PREVIEW_PANE_AREA_PADDING * 2,
        [editorPreviewAreaHeight, viewportHeight]
    );
    logRender('DataTableViewer', { debugAreaHeight });
    return (
        <DataTable
            columns={columns}
            data={data}
            fixedHeader
            fixedHeaderScrollHeight={`${debugAreaHeight}px`}
            sortIcon={<ArrowSortDown16Regular />}
            pagination
            paginationComponent={DataTableStatusBar}
            paginationPerPage={getConfig().dataTable.rowsPerPage.default}
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
                        paddingLeft: '20px'
                    }
                },
                rows: {
                    style: {
                        backgroundColor: tokens.colorNeutralBackground1,
                        color: tokens.colorNeutralForeground2,
                        paddingLeft: '20px',
                        borderBottomColor: tokens.colorNeutralStroke3,
                        borderBottomStyle: 'solid',
                        borderBottomWidth: '1px',
                        '&:not(:last-of-type)': {
                            borderBottomColor: tokens.colorNeutralStroke3,
                            borderBottomStyle: 'solid',
                            borderBottomWidth: '1px'
                        }
                    }
                },
                cells: {
                    style: { fontSize: `${DATA_TABLE_FONT_SIZE}px` }
                },
                table: {
                    style: {
                        backgroundColor: tokens.colorNeutralBackground1,
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
    );
};
