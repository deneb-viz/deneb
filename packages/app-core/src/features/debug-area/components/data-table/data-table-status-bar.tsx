import { useMemo } from 'react';
import {
    Caption1,
    Label,
    makeStyles,
    Select,
    SelectProps,
    tokens,
    useId
} from '@fluentui/react-components';
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
 * Pagination contract consumed by the status bar. Field names and call
 * signatures match what react-data-table-component's `PaginationComponentProps`
 * exposed previously, so the component internals are unchanged; the type is now
 * owned locally rather than imported from the (removed) table library.
 */
export interface DataTableStatusBarProps {
    /** Total row count across all pages. */
    rowCount: number;
    /** Current (1-based) page. */
    currentPage: number;
    /** Navigate to a page. The second arg (total rows) is unused by callers. */
    onChangePage: (page: number, totalRows: number) => void;
    /** Change the rows-per-page, preserving the caller's current page arg. */
    onChangeRowsPerPage: (
        currentRowsPerPage: number,
        currentPage: number
    ) => void;
}

/**
 * Displays at the footer of the data table, and used to control pagination and other options.
 */
export const DataTableStatusBar = ({
    rowCount,
    onChangePage,
    onChangeRowsPerPage,
    currentPage
}: DataTableStatusBarProps) => {
    const { rowsPerPageSetting, mode, translate } = useDenebState((state) => ({
        rowsPerPageSetting: state.editorPreferences.dataViewerRowsPerPage,
        mode: state.editorPreviewAreaSelectedPivot,
        translate: state.i18n.translate
    }));
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
        // Root-level `DatasetSelect` is only meaningful on the Data outer
        // pivot. The Source tab reads from `state.dataset.values` directly
        // and has no dataset-name axis to switch between, so we hide the
        // selector everywhere except the Data tab.
        if (mode === 'data') {
            return <DatasetSelect />;
        }
        return null;
    }, [mode]);

    return (
        <StatusBarContainer
            nearItems={<div>{optionComponent}</div>}
            // The pagination cluster is meaningless at zero rows (rdt hid
            // its whole bar; we keep the bar for the dataset selector and
            // hide only this side).
            farItems={
                rowCount === 0 ? null : (
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
                )
            }
        />
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
