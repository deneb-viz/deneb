import { makeStyles, tokens } from '@fluentui/react-components';

import { useDenebState } from '../../../state';
import { DatasetSelect } from './dataset-viewer/dataset-select';
import { StatusBarContainer } from '../../../components/ui';
import { useDebugWrapperStyles } from './styles';

const useNoDataMessageStyles = makeStyles({
    dataTableNoDataMessage: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        flexShrink: 1000,
        margin: tokens.spacingVerticalXS,
        overflow: 'auto'
    }
});

/**
 * Displays when no data is available in the data table.
 */
export const NoDataMessage = () => {
    const { mode, translate } = useDenebState((state) => ({
        mode: state.editorPreviewAreaSelectedPivot,
        translate: state.i18n.translate
    }));
    const classes = useNoDataMessageStyles();
    const wrapperClasses = useDebugWrapperStyles();
    const message = translate(
        mode === 'data'
            ? 'Text_Debug_Data_No_Data'
            : 'Text_Debug_Signal_No_Data'
    );
    const options = mode === 'data' ? <DatasetSelect /> : null;
    return (
        <div className={wrapperClasses.container}>
            <div className={wrapperClasses.wrapper}>
                <div className={wrapperClasses.details}>
                    <div className={classes.dataTableNoDataMessage}>
                        {message}
                    </div>
                    <StatusBarContainer nearItems={options} />
                </div>
            </div>
        </div>
    );
};
