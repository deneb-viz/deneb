import { makeStyles, tokens } from '@fluentui/react-components';

import { useDenebState } from '../../../state';
import { DatasetSelect } from './dataset-viewer/dataset-select';
import { StatusBarContainer } from '../../../components/ui';
import { useDebugWrapperStyles } from './styles';
import type { EmptyStateReason } from './empty-state-reason';
import {
    getMessageKey,
    getMessageTokens,
    shouldEmbedDatasetSelect
} from './no-data-message-utils';

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

export type NoDataMessageProps = {
    reason: EmptyStateReason;
};

/**
 * Displays when no data is available in the data table. Callers pass the
 * `reason` explicitly so the rendered copy matches the actual cause. The
 * `'dataset-unavailable'` copy substitutes the currently-selected dataset
 * name into its `{0}` placeholder; tokens are resolved via
 * `getMessageTokens` so the substitution contract is exercised in unit
 * tests without rendering the component.
 */
export const NoDataMessage = ({ reason }: NoDataMessageProps) => {
    const { translate, datasetName } = useDenebState((state) => ({
        translate: state.i18n.translate,
        datasetName: state.debug.datasetName
    }));
    const classes = useNoDataMessageStyles();
    const wrapperClasses = useDebugWrapperStyles();
    const message = translate(
        getMessageKey(reason),
        getMessageTokens(reason, datasetName)
    );
    const options = shouldEmbedDatasetSelect(reason) ? <DatasetSelect /> : null;
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
