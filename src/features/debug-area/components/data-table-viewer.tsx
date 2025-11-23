import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { ArrowSortDown16Regular } from '@fluentui/react-icons';
import { tokens } from '@fluentui/react-theme';
import DataTable, { TableProps } from 'react-data-table-component';
import { StyleSheetManager } from 'styled-components';

import store from '../../../store';
import { DataTableStatusBar } from './data-table-status-bar';
import {
    DATA_TABLE_FONT_FAMILY,
    DATA_TABLE_FONT_SIZE,
    DATA_TABLE_ROW_HEIGHT,
    DATA_TABLE_ROW_PADDING_LEFT
} from '..';
import { PREVIEW_PANE_AREA_PADDING } from '../../../constants';
import {
    EDITOR_TOOLBAR_HEIGHT,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE
} from '@deneb-viz/app-core';
import { logRender } from '@deneb-viz/utils/logging';

/**
 * Displays a table of data, either for a dataset or the signals in the Vega
 * view.
 */
// eslint-disable-next-line max-lines-per-function
export const DataTableViewer: React.FC<TableProps<any>> = ({
    columns,
    data,
    ...props
}) => {
    const { editorPreviewAreaHeight, viewportHeight, debugTableRowsPerPage } =
        store(
            (state) => ({
                editorPreviewAreaHeight: state.editorPreviewAreaHeight,
                debugTableRowsPerPage:
                    state.visualSettings.editor.debugPane.debugTableRowsPerPage
                        .value.value,
                viewportHeight: state.visualViewportCurrent.height
            }),
            shallow
        );
    const debugAreaHeight = useMemo(
        () =>
            viewportHeight -
            EDITOR_TOOLBAR_HEIGHT -
            editorPreviewAreaHeight -
            PREVIEW_PANE_TOOLBAR_MIN_SIZE * 2 -
            PREVIEW_PANE_AREA_PADDING * 2,
        [editorPreviewAreaHeight, viewportHeight]
    );
    logRender('DataTableViewer', { debugAreaHeight });
    // Filter compact prop that RDT passes to column cells but shouldn't reach DOM
    const shouldForwardProp = (propName: string) => propName !== 'compact';
    return (
        <StyleSheetManager shouldForwardProp={shouldForwardProp}>
            <DataTable
                columns={columns}
                data={data}
                fixedHeader
                fixedHeaderScrollHeight={`${debugAreaHeight}px`}
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
                                borderBottomColor: tokens.colorNeutralStroke3,
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
    );
};
