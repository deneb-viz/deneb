import { useEffect, useMemo } from 'react';
import {
    Caption1,
    Label,
    makeStyles,
    Select,
    SelectProps,
    tokens,
    useId
} from '@fluentui/react-components';
import { type PaginationComponentProps } from 'react-data-table-component';

import { DATA_VIEWER_CONFIGURATION } from '@deneb-viz/configuration';
import { useDenebState } from '../../../../state';
import { handleDataTableRowsPerPageChange } from '../../../../lib';
import { DatasetSelect } from '../dataset-viewer/dataset-select';
import { StatusBarContainer } from '../../../../components/ui';
import { DataTableNavigationButton } from './data-table-navigation-button';

const useDataTableStatusBarStyles = makeStyles({
    container: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        columnGap: '10px',
        height: '100%',
        margin: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalMNudge}`
    },
    navigation: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        columnGap: '10px',
        height: '100%'
    }
});

/**
 * Displays at the footer of the data table, and used to control pagination and other options.
 */
// eslint-disable-next-line max-lines-per-function
export const DataTableStatusBar = ({
    rowCount,
    rowsPerPage,
    onChangePage,
    onChangeRowsPerPage,
    currentPage
}: PaginationComponentProps) => {
    const { rowsPerPageSetting, mode, translate } = useDenebState((state) => ({
        rowsPerPageSetting:
            state.visualSettings.editor.debugPane.debugTableRowsPerPage.value
                .value,
        mode: state.editorPreviewAreaSelectedPivot,
        translate: state.i18n.translate
    }));
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
        handleDataTableRowsPerPageChange(value);
    };
    const numPages = getNumberOfPages(rowCount, rowsPerPageSetting as number);
    const lastIndex = currentPage * (rowsPerPageSetting as number);
    const firstIndex = lastIndex - (rowsPerPageSetting as number) + 1;
    const range =
        currentPage === numPages
            ? `${firstIndex}-${rowCount} of ${rowCount}`
            : `${firstIndex}-${lastIndex} of ${rowCount}`;
    const classes = useDataTableStatusBarStyles();
    const rowsPerPageId = useId();
    const rowsPerPageEntries = useMemo(() => getRowsPerPageValues(), []);
    const optionComponent = useMemo(() => {
        switch (mode) {
            case 'data':
                return <DatasetSelect />;
            default:
                return null;
        }
    }, [mode]);

    return (
        <StatusBarContainer>
            <div className={classes.container}>
                <div>{optionComponent}</div>
                <div className={classes.navigation}>
                    <div>
                        <Label htmlFor={rowsPerPageId} size='small'>
                            {translate('Text_Data_Table_Navigation_Rows')}
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
    DATA_VIEWER_CONFIGURATION.rowsPerPage.values.map((v) => (
        <option key={`rows-${v}`} value={v}>
            {v}
        </option>
    ));
