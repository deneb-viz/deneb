import {
    Button,
    Caption1,
    Label,
    Select,
    SelectProps,
    Tooltip,
    useId
} from '@fluentui/react-components';
import {
    ArrowNext12Regular,
    ArrowPrevious12Regular,
    ChevronLeft12Regular,
    ChevronRight12Regular
} from '@fluentui/react-icons';
import React, { useMemo } from 'react';
import { PaginationComponentProps } from 'react-data-table-component';
import { shallow } from 'zustand/shallow';

import { useDebugStyles } from '..';
import store from '../../../store';
import { StatusBarContainer } from '../../interface';
import { DatasetViewerOptions } from './dataset-viewer-options';
import { i18nValue } from '../../../core/ui/i18n';
import { getConfig } from '../../../core/utils/config';

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
                            {i18nValue('Text_Data_Table_Navigation_Rows')}
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
                    <div>
                        <Tooltip
                            content={i18nValue(
                                'Text_Data_Table_Navigation_First'
                            )}
                            relationship='label'
                        >
                            <Button
                                icon={<ArrowPrevious12Regular />}
                                onClick={handleFirstPageButtonClick}
                                appearance='subtle'
                                disabled={currentPage === 1}
                            />
                        </Tooltip>
                    </div>
                    <div>
                        <Tooltip
                            content={i18nValue(
                                'Text_Data_Table_Navigation_Previous'
                            )}
                            relationship='label'
                        >
                            <Button
                                icon={<ChevronLeft12Regular />}
                                onClick={handlePreviousButtonClick}
                                appearance='subtle'
                                disabled={currentPage === 1}
                            />
                        </Tooltip>
                    </div>
                    <div>
                        <Tooltip
                            content={i18nValue(
                                'Text_Data_Table_Navigation_Next'
                            )}
                            relationship='label'
                        >
                            <Button
                                icon={<ChevronRight12Regular />}
                                onClick={handleNextButtonClick}
                                appearance='subtle'
                                disabled={currentPage === numPages}
                            />
                        </Tooltip>
                    </div>
                    <div>
                        <Tooltip
                            content={i18nValue(
                                'Text_Data_Table_Navigation_Last'
                            )}
                            relationship='label'
                        >
                            <Button
                                icon={<ArrowNext12Regular />}
                                onClick={handleLastPageButtonClick}
                                appearance='subtle'
                                disabled={currentPage === numPages}
                            />
                        </Tooltip>
                    </div>
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
    getConfig().dataTable.rowsPerPage.values.map((v) => <option>{v}</option>);
