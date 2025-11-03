import {
    Caption1,
    Label,
    Select,
    SelectProps,
    useId
} from '@fluentui/react-components';
import React, { useEffect, useMemo } from 'react';
import { PaginationComponentProps } from 'react-data-table-component';
import { shallow } from 'zustand/shallow';

import { useDebugStyles } from '..';
import store from '../../../store';
import { StatusBarContainer } from '../../interface';
import { DatasetViewerOptions } from './dataset-viewer-options';
import { getI18nValue } from '../../i18n';
import { DataTableNavigationButton } from './data-table-navigation-button';
import { PREVIEW_PANE_DATA_TABLE } from '@deneb-viz/core-dependencies';
import { setVisualProperty } from '../../commands';

/**
 * Displays at the footer of the data table, and used to control pagination
 * and other options.
 */
// eslint-disable-next-line max-lines-per-function
export const DataTableStatusBar: React.FC<PaginationComponentProps> = ({
    rowCount,
    rowsPerPage,
    onChangePage,
    onChangeRowsPerPage,
    currentPage
}) => {
    const { rowsPerPageSetting, mode } = store(
        (state) => ({
            rowsPerPageSetting:
                state.visualSettings.editor.debugPane.debugTableRowsPerPage
                    .value.value,
            mode: state.editorPreviewAreaSelectedPivot
        }),
        shallow
    );
    useEffect(() => {
        if (rowsPerPage !== rowsPerPageSetting) {
            onChangeRowsPerPage(rowsPerPageSetting as number, currentPage);
        }
    }, [rowsPerPage, rowsPerPageSetting]);
    const handleFirstPageButtonClick = () => {
        onChangePage(1, rowCount);
    };
    const handlePreviousButtonClick = () => {
        onChangePage(currentPage - 1, rowCount);
    };
    const handleNextButtonClick = () => {
        onChangePage(currentPage + 1, rowCount);
    };
    const handleLastPageButtonClick = () => {
        onChangePage(
            Math.ceil(rowCount / (rowsPerPageSetting as number)),
            rowCount
        );
    };
    const handleChangeRowsPerPage: SelectProps['onChange'] = (event, data) => {
        const value = Number(data.value);
        onChangeRowsPerPage(value, currentPage);
        setVisualProperty([{ name: 'debugTableRowsPerPage', value }], 'editor');
    };
    const numPages = getNumberOfPages(rowCount, rowsPerPageSetting as number);
    const lastIndex = currentPage * (rowsPerPageSetting as number);
    const firstIndex = lastIndex - (rowsPerPageSetting as number) + 1;
    const range =
        currentPage === numPages
            ? `${firstIndex}-${rowCount} of ${rowCount}`
            : `${firstIndex}-${lastIndex} of ${rowCount}`;
    const classes = useDebugStyles();
    const rowsPerPageId = useId();
    const rowsPerPageEntries = useMemo(() => getRowsPerPageValues(), []);
    const optionComponent = useMemo(() => {
        switch (mode) {
            case 'data':
                return <DatasetViewerOptions />;
            default:
                return null;
        }
    }, [mode]);

    return (
        <StatusBarContainer>
            <div className={classes.statusBarTable}>
                <div>{optionComponent}</div>
                <div className={classes.statusBarTableNavigation}>
                    <div>
                        <Label htmlFor={rowsPerPageId} size='small'>
                            {getI18nValue('Text_Data_Table_Navigation_Rows')}
                        </Label>
                    </div>
                    <div>
                        <Select
                            id={rowsPerPageId}
                            value={rowsPerPageSetting}
                            onChange={handleChangeRowsPerPage}
                            size='small'
                        >
                            {rowsPerPageEntries}
                        </Select>
                    </div>
                    <div>
                        <Caption1>{range}</Caption1>
                    </div>
                    <DataTableNavigationButton
                        type='first'
                        onClick={handleFirstPageButtonClick}
                        disabled={currentPage === 1}
                    />
                    <DataTableNavigationButton
                        type='previous'
                        onClick={handlePreviousButtonClick}
                        disabled={currentPage === 1}
                    />
                    <DataTableNavigationButton
                        type='next'
                        onClick={handleNextButtonClick}
                        disabled={currentPage === numPages}
                    />
                    <DataTableNavigationButton
                        type='last'
                        onClick={handleLastPageButtonClick}
                        disabled={currentPage === numPages}
                    />
                </div>
            </div>
        </StatusBarContainer>
    );
};

/**
 * Calculate how many pages should be displayed in the table, based on props.
 */
const getNumberOfPages = (rowCount: number, rowsPerPage: number) =>
    Math.ceil(rowCount / rowsPerPage);

const getRowsPerPageValues = () =>
    PREVIEW_PANE_DATA_TABLE.rowsPerPage.values.map((v) => (
        <option key={`rows-${v}`} value={v}>
            {v}
        </option>
    ));
