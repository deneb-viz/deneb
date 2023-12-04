import {
    Caption1,
    Label,
    Select,
    SelectProps,
    useId
} from '@fluentui/react-components';
import React, { useMemo } from 'react';
import { PaginationComponentProps } from 'react-data-table-component';
import { shallow } from 'zustand/shallow';

import { useDebugStyles } from '..';
import store from '../../../store';
import { StatusBarContainer } from '../../interface';
import { DatasetViewerOptions } from './dataset-viewer-options';
import { getI18nValue } from '../../i18n';
import { DataTableNavigationButton } from './data-table-navigation-button';
import { PREVIEW_PANE_DATA_TABLE } from '../../../../config';

/**
 * Displays at the footer of the data table, and used to control pagination
 * and other options.
 */
// eslint-disable-next-line max-lines-per-function
export const DataTableStatusBar: React.FC<PaginationComponentProps> = ({
    rowsPerPage,
    rowCount,
    onChangePage,
    onChangeRowsPerPage,
    currentPage
}) => {
    const { mode } = store(
        (state) => ({
            mode: state.editorPreviewAreaSelectedPivot
        }),
        shallow
    );

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
        onChangePage(Math.ceil(rowCount / rowsPerPage), rowCount);
    };

    const handleChangeRowsPerPage: SelectProps['onChange'] = (event, data) => {
        onChangeRowsPerPage(Number(data.value), currentPage);
    };

    const numPages = getNumberOfPages(rowCount, rowsPerPage);
    const lastIndex = currentPage * rowsPerPage;
    const firstIndex = lastIndex - rowsPerPage + 1;

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
                            value={rowsPerPage}
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
    PREVIEW_PANE_DATA_TABLE.rowsPerPage.values.map((v) => <option>{v}</option>);
